import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../apiClient';
import { Part } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Plus, Trash2, Pencil, Save, X, Box } from 'lucide-react';
import logger from '../../utils/logger';

const VirtualPartsSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm, alert } = useConfirm();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ reference: '', designation: '' });

    const { data: virtualParts = [], isLoading } = useQuery({
        queryKey: ['settings', 'virtual-parts'],
        queryFn: async () => {
            const res = await apiClient.get('/api/inventory?view=virtual&limit=1000');
            return (res.data.data || res.data || []) as Part[];
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/api/inventory', { ...data, track_stock: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'virtual-parts'] });
            setIsAdding(false);
            setFormData({ reference: '', designation: '' });
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Erro ao criar item virtual.')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => apiClient.put(`/api/inventory/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'virtual-parts'] });
            setEditingId(null);
            setFormData({ reference: '', designation: '' });
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Erro ao atualizar item virtual.')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/inventory/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'virtual-parts'] }),
        onError: (err: any) => alert(err.response?.data?.error || 'Erro ao apagar item virtual.')
    });

    const handleSave = () => {
        if (!formData.reference || !formData.designation) {
            alert('Referência e Designação são obrigatórias.');
            return;
        }
        if (editingId) {
            updateMutation.mutate({ id: editingId, ...formData, track_stock: false });
        } else {
            createMutation.mutate(formData);
        }
    };

    const startEdit = (part: Part) => {
        setEditingId(part.id!);
        setFormData({ reference: part.reference, designation: part.designation });
        setIsAdding(false);
    };

    const handleDelete = async (part: Part) => {
        if (await confirm({
            title: 'Apagar Item Virtual',
            message: `Tem a certeza que deseja apagar "${part.designation}"?`,
            variant: 'danger'
        })) {
            deleteMutation.mutate(part.id!);
        }
    };

    return (
        <div className="card mb-4 border-secondary shadow-sm">
            <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                    <Box size={20} />
                    <h5 className="mb-0 fw-bold" style={{ fontFamily: 'var(--font-family-title)' }}>Itens de Texto Livre (Virtuais)</h5>
                </div>
                {!isAdding && !editingId && (
                    <button className="btn btn-sm btn-light rounded-pill px-3 fw-bold d-flex align-items-center gap-1" onClick={() => setIsAdding(true)}>
                        <Plus size={16} /> Novo
                    </button>
                )}
            </div>
            <div className="card-body p-0">
                {(isAdding || editingId) && (
                    <div className="p-3 bg-light border-bottom animate__animated animate__fadeIn">
                        <h6 className="fw-bold mb-3">{editingId ? 'Editar Item Virtual' : 'Novo Item Virtual'}</h6>
                        <div className="row g-2">
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1">Referência</label>
                                <input 
                                    className="form-control form-control-sm" 
                                    placeholder="Ex: TEX" 
                                    value={formData.reference}
                                    onChange={e => setFormData({...formData, reference: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div className="col-md-8">
                                <label className="form-label small fw-bold text-muted mb-1">Designação</label>
                                <input 
                                    className="form-control form-control-sm" 
                                    placeholder="Ex: Texto livre..." 
                                    value={formData.designation}
                                    onChange={e => setFormData({...formData, designation: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                                <X size={14} className="me-1" /> Cancelar
                            </button>
                            <button className="btn btn-sm btn-primary rounded-pill px-3 fw-bold" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                                <Save size={14} className="me-1" /> 
                                {createMutation.isPending || updateMutation.isPending ? 'A guardar...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr className="small text-muted text-uppercase" style={{ letterSpacing: '0.05em' }}>
                                <th className="ps-4">Referência</th>
                                <th>Designação</th>
                                <th className="text-end pe-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={3} className="text-center py-4 text-muted">A carregar itens virtuais...</td></tr>
                            ) : virtualParts.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-4 text-muted fst-italic">Nenhum item virtual configurado.</td></tr>
                            ) : (
                                virtualParts.map(part => (
                                    <tr key={part.id}>
                                        <td className="ps-4 fw-bold font-monospace text-primary">{part.reference}</td>
                                        <td>{part.designation}</td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button className="btn btn-sm btn-icon btn-outline-primary rounded-circle" onClick={() => startEdit(part)}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="btn btn-sm btn-icon btn-outline-danger rounded-circle" onClick={() => handleDelete(part)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="card-footer bg-white py-3">
                <small className="text-muted d-block align-items-center gap-1">
                    <strong>Nota:</strong> Itens virtuais são usados para adicionar texto livre ou serviços genéricos a agendamentos e relatórios sem rastrear stock físico.
                </small>
            </div>
        </div>
    );
};

export default VirtualPartsSettings;
