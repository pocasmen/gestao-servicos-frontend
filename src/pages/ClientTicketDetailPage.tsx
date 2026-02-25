import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { Ticket } from '../types';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import './ClientTicketDetailPage.css'; // Para estilos personalizados
import { supabase } from '../supabase';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole, TicketStatus } from '../constants/enums';
import { DetailedTicketSchema, AttachmentSchema } from '../schemas';
import logger from '../utils/logger';

// Local interfaces removed, using definitions from schemas/types
import { Attachment, DetailedTicket, TicketResponse } from '../types';

interface PresenceMessage {
  text: string;
  type: 'online' | 'offline';
  userId?: string;
}

const ClientTicketDetailPage: React.FC = () => {
  logger.debug('[DEBUG:RENDER] ClientTicketDetailPage rendering');
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<DetailedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [newMsgIndex, setNewMsgIndex] = useState<number | null>(null);
  const [presenceQueue, setPresenceQueue] = useState<PresenceMessage[]>([]);
  const [currentPresenceMsg, setCurrentPresenceMsg] = useState<PresenceMessage | null>(null);
  const [showPresencePopup, setShowPresencePopup] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, number>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [equipmentHistory, setEquipmentHistory] = useState<any[]>([]);
  const chatBodyRef = React.useRef<HTMLDivElement | null>(null);
  const { user } = useContext(AuthContext);
  const [userNameCache, setUserNameCache] = useState<Record<string, string>>({});
  const getUserDisplayNameRef = useRef((userId: string): string => `Utilizador ${userId.substring(0, 4)}`);
  const [isRealtimeUpdate, setIsRealtimeUpdate] = useState(false);
  const previousMessageCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPopupActiveRef = useRef(false);
  const { alert } = useConfirm();

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

  const fetchTicketDetails = useCallback(async (isSilent = false, isFromRealtime = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      if (isFromRealtime) setIsRealtimeUpdate(true);

      logger.debug({ isSilent, isFromRealtime }, `[DEBUG:FETCH] Fetching client ticket details`);
      const [ticketRes, attachmentsRes] = await Promise.all([
        apiClient.get(`/api/my-tickets/${id}`),
        apiClient.get(`/api/tickets/${id}/attachments`)
      ]);

      const combined = { ...ticketRes.data, attachments: attachmentsRes.data || [] };
      const result = DetailedTicketSchema.safeParse(combined);

      if (!result.success) {
        logger.error(result.error.format(), '[SCHEMA_ERROR] Detailed ticket validation failed:');
        setTicket(combined as DetailedTicket);
      } else {
        setTicket(result.data as DetailedTicket);
      }
    } catch (err: unknown) {
      logger.error(err, "Erro ao carregar detalhes do ticket:");
      if (!isSilent) alert("Não foi possível carregar os detalhes do ticket.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handleFileUpload = async () => {
    if (!selectedFile || !id) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      await apiClient.post(`/api/tickets/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await alert('Anexo enviado com sucesso!', 'Sucesso');
      await fetchTicketDetails();
      setSelectedFile(null);
    } catch (err) {
      await alert('Não foi possível enviar o anexo.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const markAsRead = async () => {
      if (!id || !ticket) return;

      const hasUnreadFromOthers = ticket.responses?.some((r: TicketResponse) => r.id && r.isNew && r.user_id !== user?.id);
      if (!hasUnreadFromOthers) return;

      try {
        await apiClient.put(`/api/my-tickets/${id}/mark-as-read`);
      } catch (error) {
        logger.error(error, 'Failed to mark messages as read:');
      }
    };
    markAsRead();
  }, [id, ticket, user?.id]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!ticket?.equipmentId) return;
      try {
        const [schedulesRes, ticketsRes] = await Promise.all([
          apiClient.get('/api/my-schedules?page=1&limit=50'),
          apiClient.get('/api/my-tickets?page=1&limit=50')
        ]);

        const schedulesData = schedulesRes.data.data || schedulesRes.data;
        const ticketsData = ticketsRes.data.data || ticketsRes.data;

        const scheds = (Array.isArray(schedulesData) ? schedulesData : [])
          .filter((s: any) => s.equipmentId === ticket.equipmentId && s.isCompleted);
        const tks = (Array.isArray(ticketsData) ? ticketsData : [])
          .filter((t: any) => t.equipmentId === ticket.equipmentId && t.status === TicketStatus.CLOSED && t.id !== ticket.id);

        const combined = [
          ...scheds.map(s => ({ ...s, historyType: 'service', date: s.startDate })),
          ...tks.map(t => ({ ...t, historyType: 'ticket', date: t.createdAt }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        setEquipmentHistory(combined);
      } catch (err) {
        logger.error(err, "Erro ao carregar histórico do equipamento:");
      }
    };
    fetchHistory();
  }, [ticket?.equipmentId, ticket?.id]);

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
      logger.debug(p, '[DEBUG:PRESENCE] Broadcast received (client):');
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

  const isUserOnline = (userId: string) => {
    const lastTs = userPresence[userId] || 0;
    return lastTs > 0 && (Date.now() - lastTs < 60000);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsReplying(true);
    try {
      await apiClient.post(`/api/my-tickets/${id}/reply`, { message: replyContent });
      setReplyContent('');
      await fetchTicketDetails(); // Re-fetch the entire ticket to show updated faultDescription
    } catch (err) {
      logger.error(err, "Erro ao enviar resposta:");
      await alert("Não foi possível enviar a sua resposta.");
    } finally {
      setIsReplying(false);
    }
  };

  const messages = React.useMemo(() => {
    const text = ticket?.faultDescription || '';
    const lines = text.split('\n').filter((l: string) => l.trim().length > 0 && !l.startsWith('[Título]'));
    const clientName = `${ticket?.userFirstName || ''} ${ticket?.userLastName || ''}`.trim() || 'Cliente';
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
      if (!Number.isFinite(dateMs)) {
        dateMs = 0;
      }
      const content = l.replace(/^\[.*?\]\s?/, '');
      const displayTs = isFinite(dateMs) ? format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }) : '';
      const authorName = isClient ? clientName : 'Gestor';
      const avatarText = authorName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
      return { isClient, authorName, avatarText, content, dateMs, displayTs, role: UserRole.CLIENT, authorId: ticket?.created_by_user_id };
    });

    const techMsgs = (ticket?.responses || []).map((r: TicketResponse) => {
      let dateMs = new Date(r.created_at).getTime();
      if (!Number.isFinite(dateMs)) {
        dateMs = 0;
      }
      const authorName = r.authorName || 'Técnico';
      const avatarText = authorName.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0, 2);
      const isUnread = !!r.isNew;
      const isClient = r.role === UserRole.CLIENT || r.role === UserRole.PENDING_CLIENT;
      return { isClient, authorName, avatarText, content: r.message, dateMs, displayTs: format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }), isUnread, role: r.role || UserRole.ADMIN, authorId: r.user_id || r.technician_id };
    });

    const result = [...clientMsgs, ...techMsgs].sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0));
    logger.debug(`[DEBUG:MESSAGES] Recalculated messages list (client). Total: ${result.length}`);
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


  // 1️⃣ Scroll inicial ao carregar o ticket
  useEffect(() => {
    if (!chatBodyRef.current || !ticket?.id) return;

    const timer = setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        previousMessageCountRef.current = messages.length;
        logger.debug('[DEBUG:SCROLL] Initial scroll to bottom executed (client)');
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
    });

    const currentCount = messages.length;

    if (currentCount > previousCount && chatBodyRef.current) {
      const timer = setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
          logger.debug('[DEBUG:SCROLL] Scrolled to bottom after realtime update (client)');
        }
      }, 150);

      // Reset flag depois
      const resetTimer = setTimeout(() => {
        setIsRealtimeUpdate(false);
        logger.debug('[DEBUG:SCROLL] Reset isRealtimeUpdate flag (client)');
      }, 200);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    } else {
      // Se não há novas mensagens, apenas reset o flag
      setIsRealtimeUpdate(false);
    }
  }, [isRealtimeUpdate, messages.length]); // ⚠️ CRÍTICO: Só depende de isRealtimeUpdate!

  useEffect(() => {
    const key = id ? `ticket_last_seen_${id}` : '';
    if (!key) return;
    // Validação: Reseta lastSeen se for inválido
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
      // Validação: Apenas compara se o timestamp da mensagem for válido
      if (Number.isFinite(lastMessage.dateMs) && lastMessage.dateMs > lastSeen) {
        newMsgIdxToMark = messages.length - 1;
      }
    }

    setNewMsgIndex(newMsgIdxToMark);

    const latest = messages.length ? (messages[messages.length - 1].dateMs || 0) : 0;
    // Validação: Apenas atualiza localStorage se o timestamp for válido
    if (Number.isFinite(latest) && latest >= 0) {
      localStorage.setItem(key, String(latest));
    }
  }, [messages, id]);

  // 4️⃣ Scroll para mensagem marcada como nova
  useEffect(() => {
    if (newMsgIndex === null || !chatBodyRef.current) return;

    const timer = setTimeout(() => {
      const el = chatBodyRef.current?.querySelector('.thread-new') as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        logger.debug('[DEBUG:SCROLL] Scrolled to new message marker (client)');
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
    <div className="client-ticket-detail-page container-fluid mt-4">
      {showPresencePopup && currentPresenceMsg && (
        <div
          className={`presence-popup alert alert-${currentPresenceMsg.type === 'online' ? 'success' : 'secondary'} fixed-top mx-auto mt-3 text-center`}
          role="alert"
          style={{ width: 'fit-content', zIndex: 1050, cursor: 'pointer' }}
          onClick={() => setShowPresencePopup(false)}
        >
          {(() => {
            const name = currentPresenceMsg.userId ? (userNameCache[currentPresenceMsg.userId] || userIdToNameMap[currentPresenceMsg.userId]) : null;
            return name ? `${name} está agora ${currentPresenceMsg.type === 'online' ? 'online' : 'offline'}.` : currentPresenceMsg.text;
          })()}
        </div>
      )}
      <div className="row">
        {/* Left Column - Ticket Information */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header ticket-info-header">
              <i className="bi bi-info-circle me-2"></i> Informação do Ticket
            </div>
            <div className="card-body">
              <p><strong>Requisitante:</strong> {ticket.userFirstName} {ticket.userLastName}</p>
              <p><strong>Cliente:</strong> {ticket.clientName}</p>
              <p><strong>Equipamento:</strong> {ticket.equipmentInfo}</p>
              <p><strong>Enviado:</strong> {format(new Date(ticket.createdAt), 'dd/MM/yyyy (HH:mm)', { locale: pt })}</p>
              <p><strong>Última atualização:</strong> {format(new Date(ticket.updatedAt), 'dd/MM/yyyy (HH:mm)', { locale: pt })}</p>
              <p>
                <strong>Estado:</strong>{' '}
                <span className={`badge bg-${isTicketClosed ? 'secondary' : 'success'}`}>
                  {isTicketClosed ? 'Fechado' : 'Aberto'}
                </span>
              </p>
            </div>
          </div>

          {/* Anexos */}
          <div className="card mb-4">
            <div className="card-header ticket-info-header">
              <i className="bi bi-paperclip me-2"></i> Anexos
            </div>
            <div className="card-body">
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {ticket.attachments.map((att: Attachment) => (
                    <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                        <i className="bi bi-file-earmark me-2"></i> {att.file_name}
                      </a>
                      <small className="text-muted">{format(new Date(att.created_at), 'dd/MM/yyyy', { locale: pt })}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">Nenhum anexo disponível.</p>
              )}
              <div className="mt-3">
                <input type="file" className="form-control mb-2" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                <button className="btn btn-primary" onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                  {isUploading ? 'A carregar...' : 'Carregar Anexo'}
                </button>
              </div>
            </div>
          </div>

          {/* Histórico do Equipamento */}
          <div className="card mb-4 border-info shadow-sm">
            <div className="card-header bg-info text-white">
              <i className="bi bi-clock-history me-2"></i> Histórico do Equipamento
            </div>
            <div className="card-body">
              {equipmentHistory.length > 0 ? (
                <div className="list-group list-group-flush small">
                  {equipmentHistory.map((item, idx) => (
                    <div key={idx} className="list-group-item px-0 py-2 border-0 border-bottom">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <span className={`badge ${item.historyType === 'service' ? 'bg-success' : 'bg-secondary'} me-2`} style={{ fontSize: '0.65rem' }}>
                            {item.historyType === 'service' ? 'Serviço' : 'Ticket'}
                          </span>
                          <span className="fw-bold">{format(new Date(item.date), 'dd/MM/yyyy', { locale: pt })}</span>
                        </div>
                      </div>
                      <div className="text-truncate mt-1" style={{ maxWidth: '100%' }} title={item.title}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 text-center">
                    <Link to="/portal/history" state={{ equipmentId: ticket.equipmentId }} className="btn btn-sm btn-outline-info w-100">
                      Ver Histórico Completo
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted small mb-0">Sem intervenções anteriores registadas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Ticket Conversation */}
        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="mb-0">{ticket.clientName}</h3>

          </div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/portal">Portal</Link></li>
              <li className="breadcrumb-item"><Link to="/portal/tickets">Meus Tickets</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Ver Ticket</li>
            </ol>
          </nav>

          {isTicketClosed && (
            <div className="alert alert-warning" role="alert">
              Este ticket está fechado. Pode responder a este ticket para reabri-lo.
            </div>
          )}

          <div className="card mb-4">
            <div className="card-header ticket-info-header">
              <i className="bi bi-file-text me-2"></i> Detalhes do Ticket
            </div>
            <div className="card-body">
              <p><strong>Título:</strong> {ticket.title}</p>
              <p><strong>Avaria/Descrição:</strong> {ticket.faultDescription}</p>
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-header">
              <i className="bi bi-chat-dots me-2"></i> Thread
            </div>
            <div className="card-body" ref={chatBodyRef} aria-live="polite" aria-relevant="additions">
              {messages.length === 0 ? (
                <p className="text-muted">Sem mensagens.</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`thread-item ${m.isClient ? 'thread-client' : 'thread-tech'} ${newMsgIndex === i ? 'thread-new' : ''} ${(m as any).isUnread ? 'thread-unread' : ''}`}>
                    <div className="thread-header">
                      <div className="thread-avatar">
                        {m.avatarText}
                        {m.authorId && (
                          <span className={`status-indicator ${isUserOnline(m.authorId) ? 'online' : 'offline'}`} title={isUserOnline(m.authorId) ? 'Online' : 'Offline'}></span>
                        )}
                      </div>
                      <div className="thread-meta">
                        <strong className="thread-author">{m.authorName}</strong>
                        <small className="thread-role d-block mb-0">
                          {m.isClient ? <img src="/images/client-icon.png" alt="Cliente" className="me-2" style={{ width: '1.5em', height: '1.5em' }} /> : <img src="/images/technician-icon.png" alt="Técnico" className="me-2" style={{ width: '1.5em', height: '1.5em' }} />}
                          {m.isClient ? 'Cliente' : 'Técnico'}
                        </small>
                        <small className="thread-timestamp">{m.displayTs}</small>
                      </div>
                      <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => setReplyContent(prev => `${prev ? prev + '\n' : ''}> ${m.content}\n`)}>Citar</button>
                    </div>
                    <div className="thread-content">{m.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reply Form */}
          <div className="card mb-4">
            <div className="card-header reply-form-header" id="replyHeading">
              <button className="btn btn-link text-decoration-none w-100 text-start" type="button" data-bs-toggle="collapse" data-bs-target="#replyCollapse" aria-expanded="true" aria-controls="replyCollapse">
                <i className="bi bi-pencil-square me-2"></i> Responder
              </button>
            </div>
            <div id="replyCollapse" className="collapse show" aria-labelledby="replyHeading">
              <div className="card-body">
                <form onSubmit={handleReplySubmit}>
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      rows={10}
                      placeholder="Escreva a sua resposta aqui..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={isReplying}
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isReplying}>
                    {isReplying ? 'A enviar...' : 'Enviar Resposta'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientTicketDetailPage;
