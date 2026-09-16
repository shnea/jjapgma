import { useId } from 'react';
import type { UiNode } from '@jjapgma/ui-spec';
import './chart.css';

export function ChartElement({ node }: { node: UiNode }) {
  const id = useId();
  const data = node.props.chartData ?? [];
  const variant = node.props.chartVariant ?? 'bar';
  const unit = node.props.chartUnit ?? '';
  const maximum = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const formatted = (value: number) => value.toLocaleString('ko-KR') + (unit ? ` ${unit}` : '');
  const points = data.map((d, index) => ({
    x: 44 + ((index + 0.5) * 580) / Math.max(1, data.length),
    y: 220 - (d.value / maximum) * 180,
  }));
  let offset = 0;
  return (
    <figure className="element-chart" aria-labelledby={id}>
      <figcaption id={id}>{node.props.text || '차트'}</figcaption>
      {!data.length ? (
        <p className="chart-empty">표시할 데이터가 없습니다.</p>
      ) : (
        <>
          {variant === 'donut' ? (
            <div className="chart-donut">
              <svg
                viewBox="0 0 240 240"
                role="img"
                aria-label={`${node.props.text} · 합계 ${formatted(total)}`}
              >
                <circle
                  cx="120"
                  cy="120"
                  r="80"
                  fill="none"
                  stroke="var(--page-border, #d9e2d1)"
                  strokeWidth="28"
                />
                {total > 0 &&
                  data.map((d, index) => {
                    const fraction = (d.value / total) * 100;
                    const start = offset;
                    offset += fraction;
                    return (
                      <circle
                        key={index}
                        cx="120"
                        cy="120"
                        r="80"
                        fill="none"
                        pathLength="100"
                        stroke="var(--page-primary, #466e2c)"
                        strokeOpacity={1 - (index / Math.max(1, data.length)) * 0.6}
                        strokeWidth="28"
                        strokeDasharray={`${fraction} ${100 - fraction}`}
                        strokeDashoffset={-start}
                        transform="rotate(-90 120 120)"
                      >
                        <title>
                          {d.label}: {formatted(d.value)}
                        </title>
                      </circle>
                    );
                  })}
                <text x="120" y="113" textAnchor="middle" className="chart-caption">
                  합계
                </text>
                <text x="120" y="142" textAnchor="middle" className="chart-total">
                  {total.toLocaleString('ko-KR')}
                </text>
              </svg>
            </div>
          ) : (
            <svg
              className="chart-plot"
              viewBox="0 0 660 256"
              role="img"
              aria-label={node.props.text || '차트'}
            >
              {[0, 0.5, 1].map((tick) => (
                <g key={tick}>
                  <line
                    x1="44"
                    x2="640"
                    y1={220 - tick * 180}
                    y2={220 - tick * 180}
                    className="chart-grid"
                  />
                  <text x="38" y={224 - tick * 180} textAnchor="end" className="chart-caption">
                    {(maximum * tick).toLocaleString('ko-KR', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    })}
                  </text>
                </g>
              ))}
              {variant === 'line' && (
                <polyline
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="var(--page-primary, #466e2c)"
                  strokeWidth="3"
                />
              )}
              {data.map((d, index) => (
                <g key={index}>
                  {variant === 'bar' ? (
                    <rect
                      x={points[index].x - 160 / data.length}
                      y={points[index].y}
                      width={320 / data.length}
                      height={220 - points[index].y}
                      rx="4"
                      fill="var(--page-primary, #466e2c)"
                    >
                      <title>
                        {d.label}: {formatted(d.value)}
                      </title>
                    </rect>
                  ) : (
                    <circle
                      cx={points[index].x}
                      cy={points[index].y}
                      r="4"
                      fill="var(--page-primary, #466e2c)"
                    >
                      <title>
                        {d.label}: {formatted(d.value)}
                      </title>
                    </circle>
                  )}
                  {(data.length <= 12 || index % 2 === 0) && (
                    <text x={points[index].x} y="245" textAnchor="middle" className="chart-caption">
                      {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}
          <dl className="chart-values">
            {data.map((d, index) => (
              <div key={index}>
                <dt>{d.label}</dt>
                <dd>{formatted(d.value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </figure>
  );
}
