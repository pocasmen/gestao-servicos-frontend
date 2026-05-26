import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../apiClient';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Plus, Trash2, Pencil, Save, X, Cpu } from 'lucide-react';
import logger from '../../utils/logger';

const EquipmentCategoriesSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm, alert } = useConfirm();
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [categoryName, setCategoryName] = useState('');

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['settings', 'equipment-categories'],
        queryFn: async () => {
            const res = await apiClient.get('/api/settings');
            const catJson = res.data.equipment_categories;
            if (catJson) {
                try {
                    return JSON.parse(catJson) as string[];
                } catch (e) {
                    logger.error(e, "Erro ao parsear categorias de equipamentos:");
                    return [];
                }
            }
            return [];
        }
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (newCategories: string[]) => 
            apiClient.put('/api/settings', { equipment_categories: JSON.stringify(newCategories) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'equipment-categories'] });
            setIsAdding(false);
            setEditingIndex(null);
            setCategoryName('');
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Erro ao guardar categorias.')
    });

    const handleSave = () => {
        if (!categoryName.trim()) {
            alert('O nome da categoria é obrigatório.');
            return;
        }

        let newCategories = [...categories];
        if (editingIndex !== null) {
            newCategories[editingIndex] = categoryName.trim();
        } else {
            if (newCategories.includes(categoryName.trim())) {
                alert('Esta categoria já existe.');
                return;
            }
            newCategories.push(categoryName.trim());
        }

        updateSettingsMutation.mutate(newCategories);
    };

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setCategoryName(categories[index]);
        setIsAdding(false);
    };

    const handleDelete = async (index: number) => {
        const catToDelete = categories[index];
        if (await confirm({
            title: 'Apagar Categoria',
            message: `Tem a certeza que deseja apagar a categoria "${catToDelete}"? Isto não afetará os equipamentos já marcados, mas a categoria deixará de estar disponível para seleção.`,
            variant: 'danger'
        })) {
            const newCategories = categories.filter((_: any, i: number) => i !== index);
            updateSettingsMutation.mutate(newCategories);
        }
    };

    return (
        <div className="card mb-4 border-primary shadow-sm">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                    <Cpu size={20} />
                    <h5 className="mb-0 fw-bold" style={{ fontFamily: 'var(--font-family-title)' }}>Categorias de Equipamentos</h5>
                </div>
                {!isAdding && editingIndex === null && (
                    <button className="btn btn-sm btn-light rounded-pill px-3 fw-bold d-flex align-items-center gap-1" onClick={() => setIsAdding(true)}>
                        <Plus size={16} /> Nova
                    </button>
                )}
            </div>
            <div className="card-body p-0">
                {(isAdding || editingIndex !== null) && (
                    <div className="p-3 bg-light border-bottom animate__animated animate__fadeIn">
                        <h6 className="fw-bold mb-3">{editingIndex !== null ? 'Editar Categoria' : 'Nova Categoria'}</h6>
                        <div className="row g-2">
                            <div className="col-md-12">
                                <label className="form-label small fw-bold text-muted mb-1">Nome da Categoria</label>
                                <input 
                                    className="form-control form-control-sm" 
                                    placeholder="Ex: Cereais, Carne, Laticínios..." 
                                    value={categoryName}
                                    onChange={e => setCategoryName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => { setIsAdding(false); setEditingIndex(null); setCategoryName(''); }}>
                                <X size={14} className="me-1" /> Cancelar
                            </button>
                            <button className="btn btn-sm btn-primary rounded-pill px-3 fw-bold" onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                                <Save size={14} className="me-1" /> 
                                {updateSettingsMutation.isPending ? 'A guardar...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr className="small text-muted text-uppercase" style={{ letterSpacing: '0.05em' }}>
                                <th className="ps-4">Nome</th>
                                <th className="text-end pe-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={2} className="text-center py-4 text-muted">A carregar categorias...</td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={2} className="text-center py-4 text-muted fst-italic">Nenhuma categoria configurada.</td></tr>
                            ) : (
                                categories.map((cat: string, index: number) => (
                                    <tr key={index}>
                                        <td className="ps-4 fw-bold text-dark">{cat}</td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-1">
                                                <button className="btn btn-sm btn-icon btn-outline-primary rounded-circle" onClick={() => startEdit(index)}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="btn btn-sm btn-icon btn-outline-danger rounded-circle" onClick={() => handleDelete(index)}>
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
                    <strong>Nota:</strong> Estas categorias são usadas para organizar equipamentos por tipo de negócio ou setor.
                </small>
            </div>
        </div>
    );
};

export default EquipmentCategoriesSettings;
