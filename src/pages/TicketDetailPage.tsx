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



interface Attachment {
  id: string;
  ticket_id: number;
  file_name: string;
  mime_type: string;
  storage_path: string;
  uploaded_by_user_id: string;
  created_at: string;
  url: string;
}

export interface DetailedTicket extends Ticket {
  clientName: string;
  equipmentInfo: string;
  userFirstName: string;
  userLastName: string;
  attachments: Attachment[];
  responses?: Array<{ id: number; ticket_id: number; user_id?: string; technician_id?: string; authorName?: string; message: string; created_at: string; role?: string; authorId?: string }>;
}

interface PresenceMessage {
  text: string;
  type: 'online' | 'offline';
  userId?: string;
}

const TicketDetailPage: React.FC = () => {
  console.log('[DEBUG:RENDER] TicketDetailPage rendering');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<DetailedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (presenceQueue.length === 0 || isPopupActiveRef.current) return;

    const nextMsg = presenceQueue[0];
    console.log('[DEBUG:PRESENCE] Showing notification:', nextMsg);
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

      console.log(`[DEBUG:FETCH] Fetching ticket details (silent: ${isSilent}, realtime: ${isFromRealtime})`);
      const ticketRes = await apiClient.get(`/api/tickets/${id}`);
      console.log('[DEBUG:FETCH] Data received:', ticketRes.data);
      setTicket(ticketRes.data);
    } catch (err) {
      if (!isSilent) setError('Não foi possível carregar os detalhes do ticket.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  useEffect(() => {
    if (!id) return;

    console.log('[DEBUG:REALTIME] A iniciar subscrição para o ticket:', id);

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
          console.log('[DEBUG:REALTIME] Evento recebido na tabela responses:', payload);

          // Filtramos aqui manualmente para garantir que funciona mesmo que os tipos (int/string) sejam diferentes
          // @ts-ignore
          const ticketIdChanged = payload.new?.ticket_id || payload.old?.ticket_id;

          // Apenas atualiza se o evento for deste ticket
          if (String(ticketIdChanged) === String(id)) {
            console.log('[DEBUG:REALTIME] Atualização relevante detetada (responses)! A recarregar...');
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
          console.log('[DEBUG:REALTIME] Evento recebido na tabela attachments:', payload);
          // @ts-ignore
          const ticketIdChanged = payload.new?.ticket_id || payload.old?.ticket_id;
          if (String(ticketIdChanged) === String(id)) {
            console.log('[DEBUG:REALTIME] Atualização relevante detetada (attachments)! A recarregar...');
            fetchTicketDetails(true, true);
          }
        }
      )
      // Adicionar outro listener para mudanças no estado do ticket (ex: fechado/aberto)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        (payload) => {
          console.log('[DEBUG:REALTIME] Ticket status alterado');
          fetchTicketDetails(true, true);
        }
      )
      .subscribe((status, err) => {
        // ISTO É O MAIS IMPORTANTE PARA O DEBUG
        console.log(`[DEBUG:REALTIME] Status da conexão: ${status}`, err ? err : '');

        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao Realtime com sucesso.');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro ao conectar ao Realtime. Verifique a consola do browser e configurações do Supabase.');
        } else if (status === 'TIMED_OUT') {
          console.error('⚠️ A conexão expirou. A internet pode estar instável.');
        }
      });

    return () => {
      console.log('[DEBUG:REALTIME] A limpar canal...');
      supabase.removeChannel(channel);
    };
  }, [id, fetchTicketDetails]);

  useEffect(() => {
    const markAsRead = async () => {
      if (!id || !ticket) return;

      const hasUnreadFromOthers = ticket.responses?.some(r => r.id && (r as any).isNew && r.user_id !== user?.id);
      if (!hasUnreadFromOthers) return;

      try {
        await apiClient.put(`/api/my-tickets/${id}/mark-as-read`);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
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
      console.log('[DEBUG:PRESENCE] Broadcast received:', p);
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
      await apiClient.post(`/api/tickets/${id}/reply`, { message: replyContent });
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
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
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
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const clientMsgs = lines.map((l, idx) => {
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
          console.error("Error parsing date from line:", l, e);
        }
      } else if (idx === 0 && ticket?.createdAt) {
        dateMs = new Date(ticket.createdAt).getTime();
      }
      const content = l.replace(/^\[.*?\]\s?/, '');
      const displayTs = isFinite(dateMs) ? format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }) : '';
      const authorName = isClient ? `${ticket?.userFirstName || ''} ${ticket?.userLastName || ''}`.trim() || 'Cliente' : 'Gestor';
      return { isClient, content, dateMs, displayTs, authorName, role: 'client', authorId: ticket?.created_by_user_id };
    });

    const techMsgs = (ticket?.responses || []).map(r => {
      const dateMs = new Date(r.created_at).getTime();
      const role = r.role || 'gestor';
      const isClient = role === 'client' || role === 'pending_client';
      const isUnread = !!(r as any).isNew && isClient;
      return {
        isClient,
        content: r.message,
        dateMs,
        displayTs: format(new Date(dateMs), 'dd/MM/yyyy HH:mm', { locale: pt }),
        isUnread,
        authorName: r.authorName || 'Gestor',
        role: r.role || 'gestor',
        authorId: r.user_id || r.technician_id,
      };
    });

    const result = [...clientMsgs, ...techMsgs].sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0));
    console.log(`[DEBUG:MESSAGES] Recalculated messages list. Total: ${result.length}`);
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
        console.log('[DEBUG:SCROLL] Initial scroll to bottom executed');
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
    console.log('[DEBUG:SCROLL] Realtime update detected (admin)', {
      currentCount: messages.length,
      previousCount: previousCount
    });

    const currentCount = messages.length;

    if (currentCount > previousCount && chatBodyRef.current) {
      const timer = setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
          console.log('[DEBUG:SCROLL] Scrolled to bottom after realtime update (admin)');
        }
      }, 150);

      // Reset flag depois
      const resetTimer = setTimeout(() => {
        setIsRealtimeUpdate(false);
        console.log('[DEBUG:SCROLL] Reset isRealtimeUpdate flag (admin)');
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
        console.log('[DEBUG:SCROLL] Scrolled to new message marker (admin)');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [newMsgIndex]);



  if (loading) {
    return <div className="container mt-4">A carregar...</div>;
  }

  if (error) {
    return <div className="container mt-4 alert alert-danger">{error}</div>;
  }

  if (!ticket) {
    return <div className="container mt-4">Ticket não encontrado.</div>;
  }

  const isTicketClosed = ticket.status === 'closed';

  return (
    <div className="container-fluid mt-4 admin-ticket-detail-page">
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
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header">
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

          <div className="card mb-4">
            <div className="card-header">
              <i className="bi bi-paperclip me-2"></i> Anexos
            </div>
            <div className="card-body">
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <ul className="list-group mb-3">
                  {ticket.attachments.map((att) => (
                    <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <a href={att.url} target="_blank" rel="noreferrer">{att.file_name}</a>
                      <div>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteAttachment(att)}>Remover</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">Sem anexos.</p>
              )}
              <div className="mt-3">
                <input type="file" className="form-control mb-2" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                <button className="btn btn-primary" onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                  {isUploading ? 'A carregar...' : 'Carregar Anexo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="mb-0">{ticket.clientName}</h3>

          </div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link to="/tickets">Tickets</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Ver Ticket</li>
            </ol>
          </nav>

          <div className="card mb-4">
            <div className="card-header">
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
                  <div
                    key={i}
                    className={`thread-item ${m.isClient ? 'thread-client' : 'thread-tech'} ${newMsgIndex === i ? 'thread-new' : ''} ${(m as any).isUnread ? 'thread-unread' : ''}`}
                    role="group"
                    aria-label={`Mensagem ${m.isClient ? 'do cliente' : 'do gestor'} às ${m.displayTs}`}
                  >
                    <div className="thread-header">
                      <div className="thread-avatar">
                        {(m as any).authorName ? (m as any).authorName.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0, 2) : 'G'}
                        {m.authorId && (
                          <span className={`status-indicator ${isUserOnline(m.authorId) ? 'online' : 'offline'}`} title={isUserOnline(m.authorId) ? 'Online' : 'Offline'}>
                            <span className={`status-badge badge bg-${isUserOnline(m.authorId) ? 'success' : 'secondary'}`}>
                              {isUserOnline(m.authorId) ? 'online' : 'offline'}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="thread-meta d-flex flex-column">
                        <strong className="thread-author mb-0">{(m as any).authorName || (m.isClient ? 'Cliente' : 'Gestor')}</strong>
                        <small className="thread-role d-block mb-0">
                          {m.role === 'client' || m.role === 'pending_client' ? <img src="/images/client-icon.png" alt="Cliente" className="me-2" style={{ width: '1.5em', height: '1.5em' }} /> : <img src="/images/technician-icon.png" alt="Técnico" className="me-2" style={{ width: '1.5em', height: '1.5em' }} />}
                          {m.role === 'client' || m.role === 'pending_client' ? 'Cliente' : 'Técnico'}
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
                  <button type="submit" className="btn btn-primary w-auto" disabled={isReplying}>
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

export default TicketDetailPage;
