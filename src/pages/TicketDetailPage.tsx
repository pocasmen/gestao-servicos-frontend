import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import './TicketDetailPage.css';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { Ticket } from '../types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '../supabase';
import { AuthContext } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { UserRole, TicketStatus } from '../constants/enums';
import logger from '../utils/logger';
import { Ticket as TicketIcon } from 'lucide-react';
import { DetailedTicketSchema } from '../schemas';
import { Attachment, DetailedTicket, TicketResponse } from '../types';
import { compressIfImage } from '../utils/imageUtils';



// Local interfaces removed, using definitions from schemas/types

interface PresenceMessage {
  text: string;
  type: 'online' | 'offline';
  userId?: string;
}

const TicketDetailPage: React.FC = () => {
  logger.debug('[DEBUG:RENDER] TicketDetailPage rendering');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<DetailedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [presenceQueue, setPresenceQueue] = useState<PresenceMessage[]>([]);
  const [currentPresenceMsg, setCurrentPresenceMsg] = useState<PresenceMessage | null>(null);
  const [showPresencePopup, setShowPresencePopup] = useState(false);
  const chatBodyRef = React.useRef<HTMLDivElement | null>(null);
  const { user } = useContext(AuthContext);
  const [userNameCache, setUserNameCache] = useState<Record<string, string>>({});
  const getUserDisplayNameRef = useRef((userId: string): string => `Utilizador ${userId.substring(0, 4)}`);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPopupActiveRef = useRef(false);
  const [compressionSettings, setCompressionSettings] = useState({ quality: 0.7, maxWidth: 1280 });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await apiClient.get('/api/settings');
      setCompressionSettings({
        quality: parseFloat(data.img_compression_quality || '0.7'),
        maxWidth: parseInt(data.img_compression_max_width || '1280')
      });
    } catch (err) {
      logger.error(err, "Erro ao carregar definições de compressão");
    }
  };

  useEffect(() => {
    if (presenceQueue.length === 0 || isPopupActiveRef.current) return;

    const nextMsg = presenceQueue[0];
    logger.debug(nextMsg, '[DEBUG:PRESENCE] Showing notification:');
    setCurrentPresenceMsg(nextMsg);
    setShowPresencePopup(true);
    isPopupActiveRef.current = true;

    const closePopup = () => {
      const popup = document.querySelector('.presence-popup');
      popup?.classList.add('hiding');

      setTimeout(() => {
        setShowPresencePopup(false);
        isPopupActiveRef.current = false;
        setPresenceQueue(prev => prev.slice(1));
      }, 300);
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closePopup, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [presenceQueue.length]);

  const [userPresence, setUserPresence] = useState<Record<string, number>>({});
  const [newMsgIndex, setNewMsgIndex] = useState<number | null>(null);
  const [isRealtimeUpdate, setIsRealtimeUpdate] = useState(false);
  const previousMessageCountRef = useRef(0);

  const fetchTicketDetails = useCallback(async (isSilent = false, isFromRealtime = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      if (isFromRealtime) setIsRealtimeUpdate(true);

      logger.debug({ isSilent, isFromRealtime }, `[DEBUG:FETCH] Fetching ticket details`);
      const response = await apiClient.get(`/api/tickets/${id}`);

      const result = DetailedTicketSchema.safeParse(response.data);
      if (!result.success) {
        logger.error(result.error.format(), '[SCHEMA_ERROR] Detailed ticket validation failed:');
        setTicket(response.data as DetailedTicket);
      } else {
        setTicket(result.data as DetailedTicket);
      }
    } catch (err: unknown) {
      if (!isSilent) alert('Não foi possível carregar os detalhes do ticket.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  useEffect(() => {
    if (!id) return;

    logger.debug({ ticketId: id }, '[DEBUG:REALTIME] A iniciar subscrição para o ticket');

    const channel = supabase
      .channel(`ticket_room_${id}`) // Nome único para o canal
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'ticket_responses', // Tabela de mensagens
        },
        (payload) => {
          logger.debug(payload, '[DEBUG:REALTIME] Evento recebido na tabela responses:');

          // Filtramos aqui manualmente para garantir que funciona mesmo que os tipos (int/string) sejam diferentes
          // @ts-ignore
          const ticketIdChanged = payload.new?.ticket_id || payload.old?.ticket_id;

          // Apenas atualiza se o evento for deste ticket
          if (String(ticketIdChanged) === String(id)) {
            logger.debug('[DEBUG:REALTIME] Atualização relevante detetada (responses)! A recarregar...');
            setIsRealtimeUpdate(true);
            fetchTicketDetails(true, true);
          }
        }
      )
      // Listener para anexos
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_attachments',
        },
        (payload) => {
          logger.debug(payload, '[DEBUG:REALTIME] Evento recebido na tabela attachments:');
          // @ts-ignore
          const ticketIdChanged = payload.new?.ticket_id || payload.old?.ticket_id;
          if (String(ticketIdChanged) === String(id)) {
            logger.debug('[DEBUG:REALTIME] Atualização relevante detetada (attachments)! A recarregar...');
            fetchTicketDetails(true, true);
          }
        }
      )
      // Adicionar outro listener para mudanças no estado do ticket (ex: fechado/aberto)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        (payload) => {
          logger.debug('[DEBUG:REALTIME] Ticket status alterado');
          fetchTicketDetails(true, true);
        }
      )
      .subscribe((status, err) => {
        // ISTO É O MAIS IMPORTANTE PARA O DEBUG
        logger.debug({ err }, `[DEBUG:REALTIME] Status da conexão: ${status}`);

        if (status === 'SUBSCRIBED') {
          logger.info('✅ Conectado ao Realtime com sucesso.');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ Erro ao conectar ao Realtime. Verifique a consola do browser e configurações do Supabase.');
        } else if (status === 'TIMED_OUT') {
          logger.error('⚠️ A conexão expirou. A internet pode estar instável.');
        }
      });

    return () => {
      logger.debug('[DEBUG:REALTIME] A limpar canal...');
      supabase.removeChannel(channel);
    };
  }, [id, fetchTicketDetails]);

  useEffect(() => {
    const markAsRead = async () => {
      if (!id || !ticket) return;

      const hasUnreadFromOthers = ticket.responses?.some(r => r.id && (r as any).isNew && r.user_id !== user?.id);
      if (!hasUnreadFromOthers) return;

      try {
        await apiClient.put(`/api/tickets/${id}/mark-as-read`);
      } catch (error) {
        logger.error(error, 'Failed to mark messages as read:');
      }
    };
    markAsRead();
  }, [id, ticket, user?.id]);

  useEffect(() => {
    if (!id || !user?.id) return;
    const presenceChannel = supabase.channel(`ticket_presence_${id}`);
    presenceChannel.subscribe();

    const sendPresence = (isOnline = true) => {
      if (user?.id) {
        const ts = isOnline ? Date.now() : 0;
        setUserPresence(prev => ({ ...prev, [user.id!]: ts }));
        presenceChannel.send({ type: 'broadcast', event: 'presence', payload: { userId: user.id, ts } });
      }
    };

    sendPresence(true);
    const interval = setInterval(() => sendPresence(true), 30000);

    const handleBeforeUnload = () => {
      sendPresence(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    presenceChannel.on('broadcast', { event: 'presence' }, payload => {
      const p: any = payload?.payload;
      logger.debug(p, '[DEBUG:PRESENCE] Broadcast received:');
      if (p?.userId && typeof p?.ts === 'number') {
        setUserPresence(prev => {
          const lastTs = prev[p.userId] || 0;
          const wasOnline = lastTs > 0 && (Date.now() - lastTs < 60000);
          const isNowOnline = p.ts > 0 && (Date.now() - p.ts < 60000);

          if (wasOnline !== isNowOnline) {
            const tempName = getUserDisplayNameRef.current(p.userId);
            const msg = `${tempName} está agora ${isNowOnline ? 'online' : 'offline'}.`;
            setPresenceQueue(q => {
              const newQueue: PresenceMessage[] = [...q, { text: msg, type: isNowOnline ? 'online' : 'offline', userId: p.userId }];
              return newQueue.length > 10 ? newQueue.slice(-10) : newQueue;
            });
          }
          return { ...prev, [p.userId]: p.ts };
        });
      }
    });
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendPresence(false);
      supabase.removeChannel(presenceChannel);
    };
  }, [id, user?.id]);

  const isUserOnline = (userId: string) => {
    const lastTs = userPresence[userId] || 0;
    return lastTs > 0 && (Date.now() - lastTs < 60000);
  };

  // No topo do componente
  const { confirm, alert } = useConfirm();

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsReplying(true);
    try {
      await apiClient.post(`/api/tickets/${id}/responses`, { message: replyContent });
      setReplyContent('');
      await fetchTicketDetails();
    } catch (err) {
      await alert('Não foi possível enviar a sua resposta.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!id) return;
    if (!await confirm({
      message: `Remover o ficheiro "${attachment.file_name}"?`,
      title: 'Remover Anexo',
      variant: 'danger',
      confirmText: 'Remover'
    })) return;

    try {
      await apiClient.delete(`/api/tickets/${id}/attachments/${attachment.id}`);
      await fetchTicketDetails();
    } catch (err) {
      await alert('Não foi possível remover o ficheiro.');
    }
  };

  const handleFileUpload = async () => {
    if (!id || !selectedFile) return;

    setIsUploading(true);
    try {
      const fileToUpload = await compressIfImage(selectedFile, {
        quality: compressionSettings.quality,
        maxWidth: compressionSettings.maxWidth
      });

      const formData = new FormData();
      formData.append('file', fileToUpload);

      await apiClient.post(`/api/tickets/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await alert('Ficheiro carregado com sucesso!', 'Sucesso');
      setSelectedFile(null);
      await fetchTicketDetails();
    } catch (err) {
      await alert('Não foi possível carregar o ficheiro.');
    } finally {
      setIsUploading(false);
    }
  };

  const messages = React.useMemo(() => {
    const text = ticket?.faultDescription || '';
    const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
    const clientMsgs = lines.map((l: string, idx: number) => {
      const isClient = l.includes('Resposta do cliente') || (!l.includes('Resposta do gestor') && idx === 0);
      const m = l.match(/em\s(\d{2}\/\d{2}\/\d{4})\s(\d{2}:\d{2})(?::\d{2})?/);
      let dateMs = NaN;
      if (m) {
        try {
          const [d, t] = [m[1], m[2]];
          const [day, month, year] = d.split('/').map(Number);
          const [hour, minute] = t.split(':').map(Number);
          const parsedDate = new Date(year, month - 1, day, hour, minute);
          if (!isNaN(parsedDate.getTime())) {
            dateMs = parsedDate.getTime();
          }
        } catch (e) {
          logger.error(e, `Error parsing date from line: ${l}`);
        }
      } else if (idx === 0 && ticket?.createdAt) {
        dateMs = new Date(ticket.createdAt).getTime();
      }
      const content = l.replace(/^\[.*?\]\s?/, '');
      const displayTs = isFinite(dateMs) ? format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }) : '';
      const authorName = isClient ? `${ticket?.userFirstName || ''} ${ticket?.userLastName || ''}`.trim() || 'Cliente' : 'Gestor';
      const avatarText = authorName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
      return { isClient, content, dateMs, displayTs, authorName, avatarText, role: UserRole.CLIENT, authorId: ticket?.created_by_user_id };
    });

    const techMsgs = (ticket?.responses || []).map((r: TicketResponse) => {
      const dateMs = new Date(r.created_at).getTime();
      const role = (r.role as UserRole) || UserRole.ADMIN;
      const isClient = role === UserRole.CLIENT || role === UserRole.PENDING_CLIENT;
      const isUnread = !!r.isNew && isClient;
      const authorName = r.authorName || 'Gestor';
      const avatarText = authorName.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0, 2);
      return {
        isClient,
        content: r.message,
        dateMs,
        displayTs: format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }),
        isUnread,
        authorName,
        avatarText,
        role: r.role || 'gestor',
        authorId: r.user_id || r.technician_id,
      };
    });

    const result = [...clientMsgs, ...techMsgs].sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0));
    logger.debug(`[DEBUG:MESSAGES] Recalculated messages list. Total: ${result.length}`);
    return result;
  }, [ticket?.id, ticket?.faultDescription, ticket?.responses, ticket?.createdAt, ticket?.userFirstName, ticket?.userLastName, ticket?.created_by_user_id]);

  const userIdToNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (user?.id) {
      const fullName = user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
      if (fullName) {
        map[user.id] = fullName;
      }
    }
    if (ticket?.created_by_user_id) {
      map[ticket.created_by_user_id] = `${ticket.userFirstName || ''} ${ticket.userLastName || ''}`.trim() || 'Cliente';
    }
    messages.forEach(m => {
      if (m.authorId && m.authorName) {
        map[m.authorId] = m.authorName;
      }
    });
    return map;
  }, [messages, user?.id, ticket?.created_by_user_id, ticket?.userFirstName, ticket?.userLastName]);

  // Sincroniza o cache de nomes apenas quando o mapa derivado das mensagens mudar
  useEffect(() => {
    setUserNameCache(prev => {
      const hasChanges = Object.keys(userIdToNameMap).some(key => prev[key] !== userIdToNameMap[key]);
      if (!hasChanges) return prev;
      return { ...prev, ...userIdToNameMap };
    });
  }, [userIdToNameMap]);

  useEffect(() => {
    getUserDisplayNameRef.current = (userId: string): string => {
      if (userNameCache[userId]) return userNameCache[userId];
      if (userIdToNameMap[userId]) return userIdToNameMap[userId];
      return `Utilizador ${userId.substring(0, 4)}`;
    };
  }, [userNameCache, userIdToNameMap]);

  useEffect(() => {
    const key = id ? `ticket_last_seen_${id}` : '';
    if (!key) return;
    const rawLastSeen = localStorage.getItem(key) || '0';
    let lastSeen = 0;
    if (rawLastSeen && /^\d+$/.test(rawLastSeen)) {
      const num = Number(rawLastSeen);
      if (Number.isFinite(num) && num >= 0) {
        lastSeen = num;
      }
    }
    let newMsgIdxToMark = null;

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (Number.isFinite(lastMessage.dateMs) && lastMessage.dateMs > lastSeen) {
        newMsgIdxToMark = messages.length - 1;
      }
    }

    setNewMsgIndex(newMsgIdxToMark);

    const latest = messages.length ? (messages[messages.length - 1].dateMs || 0) : 0;
    if (Number.isFinite(latest) && latest >= 0) {
      localStorage.setItem(key, String(latest));
    }
  }, [messages, id]);

  // 1️⃣ Scroll inicial ao carregar o ticket
  useEffect(() => {
    if (!chatBodyRef.current || !ticket?.id) return;

    const timer = setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        logger.debug('[DEBUG:SCROLL] Initial scroll to bottom executed');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ticket?.id]);

  // 2️⃣ Atualizar contador de mensagens (sem scroll)
  useEffect(() => {
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  // 3️⃣ Scroll quando há atualização de realtime
  useEffect(() => {
    if (!isRealtimeUpdate) return;

    const previousCount = previousMessageCountRef.current;
    logger.debug({
      currentCount: messages.length,
      previousCount: previousCount
    }, '[DEBUG:SCROLL] Realtime update detected (admin)');

    const currentCount = messages.length;

    if (currentCount > previousCount && chatBodyRef.current) {
      const timer = setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
          logger.debug('[DEBUG:SCROLL] Scrolled to bottom after realtime update (admin)');
        }
      }, 150);

      // Reset flag depois
      const resetTimer = setTimeout(() => {
        setIsRealtimeUpdate(false);
        logger.debug('[DEBUG:SCROLL] Reset isRealtimeUpdate flag (admin)');
      }, 200);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    } else {
      // Se não há novas mensagens, apenas reset o flag
      setIsRealtimeUpdate(false);
    }
  }, [isRealtimeUpdate, messages.length]); // ⚠️ CRÍTICO: Dependências otimizadas!

  // 4️⃣ Scroll para mensagem marcada como nova
  useEffect(() => {
    if (newMsgIndex === null || !chatBodyRef.current) return;

    const timer = setTimeout(() => {
      const el = chatBodyRef.current?.querySelector('.thread-new') as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        logger.debug('[DEBUG:SCROLL] Scrolled to new message marker (admin)');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [newMsgIndex]);



  if (loading) {
    return <div className="container-fluid mt-4">A carregar...</div>;
  }

  if (!ticket) {
    return <div className="container-fluid mt-4">Ticket não encontrado.</div>;
  }

  const isTicketClosed = ticket.status === TicketStatus.CLOSED;

  return (
    <div className="container-fluid py-4 min-vh-100 bg-light admin-ticket-detail-page">
      {showPresencePopup && currentPresenceMsg && (
        <div
          className={`presence-popup alert shadow-lg fixed-top mx-auto mt-3 text-center animate__animated animate__slideInDown ${currentPresenceMsg.type === 'online' ? 'bg-success text-white' : 'bg-secondary text-white'}`}
          role="alert"
          style={{ width: 'fit-content', left: '50%', transform: 'translateX(-50%)', zIndex: 1050, cursor: 'pointer' }}
          onClick={() => setShowPresencePopup(false)}
        >
          {(() => {
            const name = currentPresenceMsg.userId ? (userNameCache[currentPresenceMsg.userId] || userIdToNameMap[currentPresenceMsg.userId]) : null;
            return name ? `${name} está agora ${currentPresenceMsg.type === 'online' ? 'online' : 'offline'}.` : currentPresenceMsg.text;
          })()}
        </div>
      )}

      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 mt-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2 small fw-medium">
              <li className="breadcrumb-item"><Link to="/dashboard" className="text-muted text-decoration-none">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link to="/tickets" className="text-muted text-decoration-none">Tickets</Link></li>
              <li className="breadcrumb-item active text-primary" aria-current="page">#{id}</li>
            </ol>
          </nav>
          <div className="d-flex align-items-center gap-3">
            <TicketIcon size={32} strokeWidth={2.5} className="text-primary" />
            <h1 className="fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', color: 'var(--primary-color)', fontSize: '2rem' }}>
              {ticket.clientName}
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2">
            <span className={`badge rounded-pill border-0 px-3 py-1 fw-bold ${isTicketClosed ? 'bg-secondary bg-opacity-15 text-secondary' : 'bg-success bg-opacity-15 text-success'}`}>
              <span className="me-1">{isTicketClosed ? '●' : '●'}</span>
              {isTicketClosed ? 'Ticket Fechado' : 'Ticket Aberto'}
            </span>
            <span className="text-muted small fw-medium">ID: #{id}</span>
          </div>
        </div>
        <div className="d-flex gap-3">
          <button className="btn btn-light rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 border" onClick={() => navigate('/tickets')}>
            Sair
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Info & Attachments */}
        <div className="col-lg-4">
          <div className="glass-card border-0 shadow-sm mb-4 overflow-hidden animate__animated animate__fadeInLeft">
            <div className="bg-dark px-4 py-3">
              <h6 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle"></i>
                Informação do Pedido
              </h6>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="text-muted small fw-bold text-uppercase d-block mb-1">Título do Ticket</label>
                <div className="fw-bold text-dark">{ticket.title}</div>
              </div>

              <div className="mb-3 d-flex align-items-start gap-3 p-3 rounded-4 bg-light border border-white shadow-sm">
                <div className="bg-primary bg-opacity-10 rounded-circle p-2 text-primary">
                  <i className="bi bi-person h5 m-0"></i>
                </div>
                <div>
                  <label className="text-muted small fw-bold text-uppercase d-block mb-0">Requisitante</label>
                  <div className="fw-bold text-dark">{ticket.userFirstName} {ticket.userLastName}</div>
                </div>
              </div>

              <div className="mb-3 d-flex align-items-start gap-3 p-3 rounded-4 bg-light border border-white shadow-sm">
                <div className="bg-info bg-opacity-10 rounded-circle p-2 text-info">
                  <i className="bi bi-laptop h5 m-0"></i>
                </div>
                <div>
                  <label className="text-muted small fw-bold text-uppercase d-block mb-0">Equipamento</label>
                  <div className="fw-bold text-dark">{ticket.equipmentInfo || 'Não especificado'}</div>
                </div>
              </div>

              <hr className="my-4 opacity-10" />

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Criado em:</span>
                <span className="fw-medium small">{format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm', { locale: pt })}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Última Ativ.:</span>
                <span className="fw-medium small">{format(new Date(ticket.updatedAt), 'dd MMM yyyy, HH:mm', { locale: pt })}</span>
              </div>
            </div>
          </div>

          <div className="glass-card border-0 shadow-sm mb-4 overflow-hidden animate__animated animate__fadeInLeft" style={{ animationDelay: '0.1s' }}>
            <div className="bg-dark px-4 py-3">
              <h6 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                <i className="bi bi-paperclip"></i>
                Ficheiros e Anexos
              </h6>
            </div>
            <div className="p-4">
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <div className="list-group list-group-flush mb-4">
                  {ticket.attachments.map((att) => (
                    <div key={att.id} className="attachment-item d-flex justify-content-between align-items-center p-2 mb-2 border rounded-3 bg-white shadow-sm">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <i className="bi bi-file-earmark-text text-primary fs-5"></i>
                        <a href={att.url} target="_blank" rel="noreferrer" className="text-dark text-truncate small fw-medium text-decoration-none">{att.file_name}</a>
                      </div>
                      <button className="btn btn-link text-danger p-1 shadow-none" onClick={() => handleDeleteAttachment(att)} title="Remover ficheiro">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-light rounded-4 border border-dashed mb-4">
                  <i className="bi bi-cloud-upload text-muted opacity-25 fs-1"></i>
                  <p className="text-muted small mt-2 m-0">Sem ficheiros associados.</p>
                </div>
              )}

              <div className="bg-light p-3 rounded-4 border shadow-sm">
                <label className="form-label small fw-bold text-muted text-uppercase mb-2">Adicionar novo ficheiro</label>
                <div className="input-group input-group-sm mb-2">
                  <input type="file" className="form-control rounded-start-pill border-0 shadow-none ps-3" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <button className="btn btn-primary w-100 rounded-pill fw-bold shadow-sm py-2" onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                  {isUploading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-upload me-2"></i>}
                  Carregar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Reply */}
        <div className="col-lg-8">
          <div className="glass-card border-0 shadow-sm mb-4 overflow-hidden animate__animated animate__fadeInRight">
            <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center">
              <h6 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                <i className="bi bi-chat-dots"></i>
                Conversa com o Cliente
              </h6>
              {messages.some(m => m.authorId && isUserOnline(m.authorId)) && (
                <span className="badge rounded-pill bg-success px-3 fw-bold shadow-sm animate__animated animate__pulse animate__infinite">
                  Cliente Online
                </span>
              )}
            </div>
            <div className="p-0 border-bottom">
              <div className="p-4 bg-white bg-opacity-50">
                <label className="text-muted small fw-bold text-uppercase d-block mb-2">Avaria descrita pelo cliente:</label>
                <div className="p-3 bg-light rounded-4 border-start border-primary border-4 shadow-sm fw-medium text-dark">
                  {ticket.faultDescription}
                </div>
              </div>
            </div>

            <div className="chat-body" ref={chatBodyRef} style={{ height: '500px', backgroundColor: '#fdfdfd' }}>
              {messages.length === 0 ? (
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <div className="text-center text-muted opacity-25">
                    <i className="bi bi-chat-left-dots display-1"></i>
                    <p className="fw-bold">Sem mensagens para mostrar.</p>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isQuoted = m.content.startsWith('>');
                  let content = m.content;
                  let quote = '';
                  if (isQuoted) {
                    const lines = m.content.split('\n');
                    const quoteLines = lines.filter(l => l.startsWith('>')).map(l => l.substring(1).trim());
                    quote = quoteLines.join('\n');
                    content = lines.filter(l => !l.startsWith('>')).join('\n').trim();
                  }

                  return (
                    <div
                      key={i}
                      className={`thread-item ${m.isClient ? 'thread-client' : 'thread-tech'} ${newMsgIndex === i ? 'thread-new animate__animated animate__headShake' : ''} ${(m as any).isUnread ? 'thread-unread' : ''}`}
                    >
                      <div className="thread-header">
                        <div className="thread-avatar shadow-sm position-relative">
                          {m.avatarText}
                          <span className={`role-badge ${m.isClient ? 'client' : 'tech'}`} title={m.isClient ? 'Cliente' : 'Técnico/Gestor'}>
                            <i className={`bi ${m.isClient ? 'bi-person' : 'bi-tools'}`}></i>
                          </span>
                          {m.authorId && (
                            <span className={`status-indicator ${isUserOnline(m.authorId) ? 'online' : 'offline'}`} title={isUserOnline(m.authorId) ? 'Online' : 'Offline'}></span>
                          )}
                        </div>
                        <div className="thread-meta">
                          <span className="thread-author">{m.authorName}</span>
                          <span className="thread-timestamp">{m.displayTs}</span>
                        </div>
                        {!m.isClient && (
                          <button className="btn btn-sm btn-light border-0 rounded-pill p-1 ms-2 opacity-50 hover-opacity-100 shadow-sm" onClick={() => setReplyContent(prev => `${prev ? prev + '\n' : ''}> ${m.content}\n`)} title="Citar esta mensagem">
                            <i className="bi bi-quote"></i>
                          </button>
                        )}
                      </div>
                      <div className="thread-bubble shadow-sm">
                        {quote && <div className="quote-bubble">{quote}</div>}
                        <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Form */}
            {!isTicketClosed && (
              <div className="p-4 bg-white border-top">
                <form onSubmit={handleReplySubmit}>
                  <div className="mb-3 position-relative">
                    <textarea
                      className="form-control rounded-4 border-0 bg-light p-3 shadow-none focus-ring-primary"
                      rows={4}
                      placeholder="Escreva a sua resposta para o cliente aqui..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={isReplying}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleReplySubmit(e);
                        }
                      }}
                      style={{ resize: 'none', transition: 'all 0.2s', border: '1px solid #eee' }}
                    ></textarea>
                    <div className="position-absolute bottom-0 end-0 p-2 text-muted small opacity-50">
                      Ctrl + Enter para enviar
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="text-muted small">
                      <i className="bi bi-info-circle me-1"></i>
                      O cliente será notificado via Telegram/Email.
                    </div>
                    <button type="submit" className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={isReplying || !replyContent.trim()}>
                      {isReplying ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-send-fill"></i>}
                      Enviar Resposta
                    </button>
                  </div>
                </form>
              </div>
            )}
            {isTicketClosed && (
               <div className="p-4 bg-light text-center border-top">
                  <div className="text-muted fw-bold small text-uppercase">
                    <i className="bi bi-lock-fill me-2"></i>
                    Este ticket está fechado. Não é possível enviar novas respostas.
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
