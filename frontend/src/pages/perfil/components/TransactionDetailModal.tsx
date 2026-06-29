import { TX_CONFIG, type Transaction } from '../transacciones';

const BLUE   = '#03BAE9';
const RED    = '#D82D31';
const GREEN  = '#05B15A';
const AMBER  = '#F59E0B';

function StickerPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function Block({
  label, sublabel, color, stickers,
}: {
  label: string;
  sublabel?: string;
  color: string;
  stickers: string[];
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-5 py-4 w-full"
      style={{ background: `${color}08`, border: `1.5px solid ${color}25` }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {stickers.map((s) => <StickerPill key={s} label={s} color={color} />)}
      </div>
    </div>
  );
}

function ArrowDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center my-1">
      <svg className="w-6 h-6" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    </div>
  );
}

interface Props {
  tx: Transaction;
  onClose: () => void;
  onUserClick?: (username: string) => void;
}

export default function TransactionDetailModal({ tx, onClose, onUserClick }: Props) {
  const cfg = TX_CONFIG[tx.type];
  const { detail } = tx;

  const renderDetail = () => {
    if (detail.type === 'intercambio' || detail.type === 'oferta') {
      return (
        <>
          <Block label="Entregado" color={RED} stickers={detail.given} />
          <ArrowDivider color="gray" />
          <Block label="Recibido" color={GREEN} stickers={detail.received} />
        </>
      );
    }
    if (detail.type === 'subasta') {
      return (
        <>
          <Block label="Mi oferta" color={RED} stickers={detail.myOffer} />
          <ArrowDivider color="gray" />
          <Block label="Figurita ganada" color={GREEN} stickers={[detail.received]} />
        </>
      );
    }
    if (detail.type === 'subasta-mia') {
      return (
        <>
          <Block label="Mi figurita en subasta" color={AMBER} stickers={[detail.mySticker]} />
          <ArrowDivider color="gray" />
          <Block label="Oferta ganadora" sublabel={`de ${tx.user}`} color={GREEN} stickers={detail.winnerOffer} />
        </>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div
          className="relative flex flex-col items-center pt-7 pb-6 px-6"
          style={{ background: `linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}08 100%)`, borderBottom: `2px solid ${cfg.color}30` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer bg-gray-100 hover:bg-gray-200 transition-all"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Ícono tipo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
            style={{ background: `${cfg.color}18`, color: cfg.color, border: `1.5px solid ${cfg.color}30` }}
          >
            <span className="scale-150">{cfg.icon}</span>
          </div>

          <p className="text-base font-black text-gray-900">{cfg.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>

          {/* Usuario */}
          <div
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}25` }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {onUserClick ? (
              <button
                type="button"
                onClick={() => onUserClick(tx.user)}
                className="text-sm font-bold bg-transparent border-none cursor-pointer p-0 hover:underline"
                style={{ color: BLUE }}
              >
                {tx.user}
              </button>
            ) : (
              <span className="text-sm font-bold" style={{ color: BLUE }}>{tx.user}</span>
            )}
          </div>
        </div>

        {/* Cuerpo centrado */}
        <div className="flex flex-col items-center gap-1 px-6 py-6">
          {renderDetail()}
        </div>
      </div>
    </div>
  );
}
