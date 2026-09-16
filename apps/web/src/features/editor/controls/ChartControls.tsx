import { ChartColumn, ChartLine, ChartPie, Plus, Trash2 } from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';
import { ChoiceField } from './ChoiceField';
export function ChartControls({
  node,
  onUpdate,
}: {
  node: UiNode;
  onUpdate: (fn: (node: UiNode) => void) => void;
}) {
  const data = node.props.chartData ?? [];
  return (
    <div className="chart-controls">
      <ChoiceField
        label="차트 종류"
        value={node.props.chartVariant ?? 'bar'}
        options={[
          { value: 'bar', label: '막대', icon: <ChartColumn size={20} /> },
          { value: 'line', label: '꺾은선', icon: <ChartLine size={20} /> },
          { value: 'donut', label: '도넛', icon: <ChartPie size={20} /> },
        ]}
        onChange={(value) =>
          onUpdate((n) => {
            n.props.chartVariant = value as 'bar' | 'line' | 'donut';
          })
        }
      />
      <label>
        단위
        <input
          value={node.props.chartUnit ?? ''}
          maxLength={20}
          onChange={(event) =>
            onUpdate((n) => {
              n.props.chartUnit = event.target.value;
            })
          }
        />
      </label>
      <p className="panel-help">항목과 값을 입력하세요. 최대 24개까지 표시합니다.</p>
      {data.map((point, index) => (
        <div className="chart-data-row" key={index}>
          <input
            aria-label={`차트 항목 ${index + 1}`}
            value={point.label}
            maxLength={80}
            onChange={(event) =>
              onUpdate((n) => {
                n.props.chartData![index].label = event.target.value;
              })
            }
          />
          <input
            type="number"
            aria-label={`차트 값 ${index + 1}`}
            value={point.value}
            min={0}
            max={1000000000}
            step="any"
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value >= 0 && value <= 1000000000)
                onUpdate((n) => {
                  n.props.chartData![index].value = value;
                });
            }}
          />
          <button
            type="button"
            aria-label={`차트 항목 ${index + 1} 삭제`}
            onClick={() =>
              onUpdate((n) => {
                n.props.chartData!.splice(index, 1);
              })
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={data.length >= 24}
        onClick={() =>
          onUpdate((n) => {
            (n.props.chartData ??= []).push({ label: `항목 ${data.length + 1}`, value: 0 });
          })
        }
      >
        <Plus size={14} />
        항목 추가
      </button>
    </div>
  );
}
