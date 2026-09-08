import React, { useState, useEffect } from 'react';
import { SmartInput } from './SmartInput';
import { Check } from 'lucide-react';
import { Client } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';

export const EditClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (updatedClient: Client & { propagateToReports?: boolean }) => Promise<any>;
}> = ({ isOpen, onClose, client, onSave }) => {
  const { confirm, confirmChoice, alert } = useConfirm();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [nif, setNif] = useState('');
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setNickname(client.nickname || '');
      setAddress(client.address || '');
      setCity(client.city || '');
      setPostCode(client.postCode || '');
      setNif(client.nif || '');
      setIsBlacklisted(client.is_blacklisted || false);
      setBlacklistReason(client.blacklist_reason || '');
    }
  }, [client]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (client) {
      const dataChanged = 
        name !== client.name ||
        address !== (client.address || '') ||
        city !== (client.city || '') ||
        postCode !== (client.postCode || '') ||
        nif !== (client.nif || '');

      let propagateToReports = false;
      if (dataChanged) {
        const choice = await confirmChoice({
          title: 'Propagar Alterações ao Histórico',
          message: 'Deseja propagar estas alterações (Nome/Morada/NIF) a todos os relatórios e agendamentos históricos deste cliente?',
          confirmText: 'Sim, propagar',
          extraText: 'Não, manter históricos',
          cancelText: 'Cancelar',
          variant: 'primary'
        });

        if (choice === 'cancel') {
          return; // Aborta a gravação
        }
        propagateToReports = (choice === 'confirm');
      }

      setIsSaving(true);
      try {
        const result = await onSave({
          ...client,
          name,
          nickname,
          address,
          city,
          postCode,
          nif,
          is_blacklisted: isBlacklisted,
          blacklist_reason: blacklistReason,
          propagateToReports
        });

        if (propagateToReports && result) {
          const rCount = result.updatedReportsCount || 0;
          const sCount = result.updatedSchedulesCount || 0;
          if (rCount > 0 || sCount > 0) {
            const parts = [];
            if (rCount > 0) parts.push(`${rCount} relatório(s)`);
            if (sCount > 0) parts.push(`${sCount} agendamento(s)`);
            await alert(
              `${parts.join(' e ')} foram atualizados com os novos dados do cliente.`,
              'Histórico Atualizado'
            );
          }
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card glass-card--solid border-0 shadow-lg p-0 overflow-hidden animate__animated animate__zoomIn rounded-4" style={{ width: '90%', maxWidth: '600px' }} role="dialog" aria-modal="true">
        <form onSubmit={handleSubmit}>
          <div className="bg-dark px-4 py-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
            <h5 className="text-white fw-bold m-0" style={{ fontFamily: 'var(--font-family-title)', letterSpacing: '0.02em' }}>Editar Cliente</h5>
            <button type="button" className="btn-close btn-close-white opacity-75 hover-opacity-100 transition-all" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <div className="mb-4">
              <SmartInput
                label="Nome do Registo (Oficial)"
                value={name}
                onChange={setName}
                required
                options={{ minLength: 3, blockScripts: true }}
              />
            </div>
            <div className="mb-4">
              <SmartInput
                label="Alcunha / Nome Curto"
                value={nickname}
                onChange={setNickname}
                options={{ blockScripts: true }}
              />
            </div>
            <div className="mb-4">
              <SmartInput
                label="Morada"
                value={address}
                onChange={setAddress}
                options={{ blockScripts: true }}
              />
            </div>
            <div className="row g-3">
              <div className="col-md-8 mb-3">
                <SmartInput
                  label="Localidade"
                  value={city}
                  onChange={setCity}
                  options={{ blockScripts: true }}
                />
              </div>
              <div className="col-md-4 mb-3">
                <SmartInput
                  label="Cód. Postal"
                  value={postCode}
                  onChange={setPostCode}
                  options={{ maxLength: 8 }}
                />
              </div>
            </div>
            <div className="mb-2">
              <SmartInput
                label="NIF"
                value={nif}
                onChange={setNif}
                options={{ type: 'numeric', minLength: 9, maxLength: 9, disableHeuristics: true }}
              />
            </div>

            <div className="mt-4 p-3 rounded-3 border border-danger border-opacity-10 bg-danger bg-opacity-10">
              <div className="form-check form-switch d-flex align-items-center gap-3">
                <input
                  className="form-check-input mt-0 custom-switch-danger"
                  type="checkbox"
                  role="switch"
                  id="blacklistSwitch"
                  checked={isBlacklisted}
                  onChange={(e) => setIsBlacklisted(e.target.checked)}
                  style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label className="form-check-label fw-bold text-danger mb-0" htmlFor="blacklistSwitch" style={{ cursor: 'pointer' }}>
                  Marcar na Black List (Pagamentos em Atraso)
                </label>
              </div>

              {isBlacklisted && (
                <div className="mt-3 animate__animated animate__fadeIn">
                  <SmartInput
                    label="Razão do Incumprimento / Notas"
                    value={blacklistReason}
                    onChange={setBlacklistReason}
                    options={{ blockScripts: true }}
                    placeholder="Ex: Faturas de Janeiro e Fevereiro em atraso..."
                  />
                </div>
              )}
            </div>
          </div>
          <div className="px-4 py-3 bg-light bg-opacity-75 border-top d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-link text-muted text-decoration-none rounded-pill px-4 fw-medium hover-bg-light transition-all" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2 transition-all" disabled={isSaving}>
              {isSaving ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : <Check size={18} strokeWidth={2.5} />}
              Guardar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
