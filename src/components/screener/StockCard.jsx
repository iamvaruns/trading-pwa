import { useTheme } from '../../context/ThemeContext';
import { Sparkline } from '../charts/Sparkline';
import { SMATag } from './SMATag';
import { VolumeBar } from './VolumeBar';

export function StockCard({ data, indicators, onRemove, onClick, score, signals, rsData, earningsDays, horizon }) {
  const { C, D } = useTheme();

  const pos = data.change1d >= 0;
  const regime = data.price > data.sma200 ? 'ABOVE 200d' : data.price > data.sma50 ? 'ABOVE 50d' : 'BELOW MAs';
  const regColor = data.price > data.sma200 ? C.yes : data.price > data.sma50 ? C.caution : C.no;

  const verdictColor = score?.verdict === 'BUY' ? C.yes : score?.verdict === 'AVOID' ? C.no : C.caution;
  const rsKey = horizon === 'SHORT' ? 'rs1m' : horizon === 'LONG' ? 'rs1y' : 'rs3m';
  const rsVal = rsData?.[rsKey];
  const rsColor = rsVal > 1 ? C.yes : rsVal < 1 ? C.no : C.dim;
  const topSignals = (signals || []).slice(0, 3);

  return (
    <div className="fade-in" onClick={onClick} style={{
      background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 6,
      padding: D.cardPad, marginBottom: 10,
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.cardSymbol, color: C.text, fontWeight: 700 }}>{data.symbol}</span>
            <span style={{
              fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
              padding: '2px 8px', border: `1px solid ${regColor}40`, color: regColor,
            }}>{regime}</span>
            {score && (
              <span style={{
                fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, fontWeight: 700,
                padding: '2px 10px', borderRadius: 10,
                background: `${verdictColor}18`, border: `1px solid ${verdictColor}60`, color: verdictColor,
              }}>{score.total} {score.verdict}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.cardPrice, color: C.text }}>{data.price?.toFixed(2)}</span>
            <span style={{
              fontFamily: 'Share Tech Mono', fontSize: D.cardChange,
              color: pos ? C.yes : C.no,
            }}>{pos ? '+' : ''}{data.change1d?.toFixed(2)}%</span>
            {rsVal != null && (
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: rsColor }}>
                RS: {rsVal.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{
              background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, borderRadius: 3,
            }}>&#x2715; REMOVE</button>
          )}
          <Sparkline
            closes={data.closes} width={D.sparkW} height={D.sparkH}
            showSMA={{ 20: indicators.sma20, 50: indicators.sma50 }}
          />
        </div>
      </div>

      {earningsDays != null && (
        <div style={{
          fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, marginBottom: 8,
          padding: '3px 10px', display: 'inline-block', borderRadius: 3,
          background: `${C.caution}18`, border: `1px solid ${C.caution}40`, color: C.caution,
        }}>
          EARNINGS IN {earningsDays}d
        </div>
      )}

      {topSignals.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {topSignals.map((sig, i) => {
            const dotColor = sig.direction === 'bullish' ? C.yes : sig.direction === 'bearish' ? C.no : C.caution;
            return (
              <span key={i} style={{
                fontFamily: 'Share Tech Mono', fontSize: D.rowStatus - 1,
                color: dotColor, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                  background: dotColor,
                }} />
                {sig.type.replace(/_/g, ' ')}
              </span>
            );
          })}
        </div>
      )}

      <div>
        <SMATag label="SMA 20" price={data.price} sma={data.sma20} color={C.sma20} visible={indicators.sma20} />
        <SMATag label="SMA 50" price={data.price} sma={data.sma50} color={C.sma50} visible={indicators.sma50} />
        <SMATag label="SMA 100" price={data.price} sma={data.sma100} color={C.sma100} visible={indicators.sma100} />
        <SMATag label="SMA 200" price={data.price} sma={data.sma200} color={C.sma200} visible={indicators.sma200} />
        <VolumeBar volume={data.volume} avgVol={data.avgVol20} visible={indicators.volume} />
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>RSI(14)</div>
            <div style={{
              fontFamily: 'Share Tech Mono', fontSize: D.rowValue,
              color: data.rsi14 > 70 ? C.no : data.rsi14 < 30 ? C.yes : C.text,
            }}>{data.rsi14?.toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>1Y %ILE</div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowValue, color: C.text }}>{data.percentile1y}th</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>5D SLOPE</div>
            <div style={{
              fontFamily: 'Share Tech Mono', fontSize: D.rowValue,
              color: data.slope5d > 0 ? C.yes : C.no,
            }}>{data.slope5d > 0 ? '+' : ''}{data.slope5d?.toFixed(2)}</div>
          </div>
          {data.atr14 != null && (
            <div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>ATR(14)</div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowValue, color: C.text }}>{data.atr14.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
