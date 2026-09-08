import React from 'react';

export interface GoogleColor {
    id: string;
    name: string;
    hex: string;
}

export const googleColors: GoogleColor[] = [
    { id: '1', name: 'Lavanda', hex: '#a4bdfc' },
    { id: '2', name: 'Sálvia', hex: '#7ae7bf' },
    { id: '3', name: 'Uva', hex: '#bdadff' },
    { id: '4', name: 'Flamingo', hex: '#ff887c' },
    { id: '5', name: 'Banana', hex: '#fbd75b' },
    { id: '6', name: 'Tangerina', hex: '#ffb878' },
    { id: '7', name: 'Pavão', hex: '#46d6db' },
    { id: '8', name: 'Grafite', hex: '#e1e1e1' },
    { id: '9', name: 'Mirtilo', hex: '#5484ed' },
    { id: '10', name: 'Manjericão', hex: '#51b749' },
    { id: '11', name: 'Tomate', hex: '#dc2127' },
];

interface Props {
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

const GoogleColorPicker: React.FC<Props> = ({ value, onChange, label }) => {
    const selectedColor = googleColors.find(c => c.id === value) || googleColors[8]; // Default to Blueberry

    return (
        <div className="google-color-picker mb-3">
            {label && <label className="form-label">{label}</label>}
            <div className="dropdown">
                <button
                    className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center w-100 justify-content-between"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{ textAlign: 'left', backgroundColor: '#fff' }}
                >
                    <div className="d-flex align-items-center">
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: selectedColor.hex,
                                borderRadius: '3px',
                                marginRight: '10px',
                                border: '1px solid rgba(0,0,0,0.1)'
                            }}
                        />
                        <span>{selectedColor.name}</span>
                    </div>
                </button>
                <ul className="dropdown-menu w-100 shadow" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {googleColors.map(color => (
                        <li key={color.id}>
                            <button
                                className={`dropdown-item d-flex align-items-center ${value === color.id ? 'active' : ''}`}
                                type="button"
                                onClick={() => onChange(color.id)}
                            >
                                <div
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        backgroundColor: color.hex,
                                        borderRadius: '3px',
                                        marginRight: '12px',
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                />
                                {color.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GoogleColorPicker;
