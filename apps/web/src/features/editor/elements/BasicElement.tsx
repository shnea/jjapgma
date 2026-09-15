import { useContext, useState, type ElementType } from 'react';
import { ExportAssetsContext } from '../export/ExportAssets';
import {
  Plus,
  Image,
  Star,
  Heart,
  Search,
  Settings,
  Check,
  X,
  AlertCircle,
  Inbox,
  CheckCircle2,
  Info,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileImage } from '../files/FileAssets';

export function BasicElement({ node }: { node: UiNode }) {
  const exportedAssets = useContext(ExportAssetsContext);
  const [pressed, setPressed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const Icon = ({ size = 20 }: { size?: number }) => {
    const icons: Record<string, ElementType> = {
      plus: Plus,
      star: Star,
      heart: Heart,
      search: Search,
      settings: Settings,
      check: Check,
      x: X,
      'arrow-left': ArrowLeft,
      'arrow-right': ArrowRight,
      'arrow-up': ArrowUp,
      'arrow-down': ArrowDown,
      'chevron-left': ChevronLeft,
      'chevron-right': ChevronRight,
    };
    const Component = icons[node.props.iconName as string] ?? Star;
    return <Component size={size} />;
  };

  switch (node.type as string) {
    case 'heading': {
      const Tag = (node.props.titleLevel ?? 'h2') as ElementType;
      return <Tag>{node.props.text}</Tag>;
    }
    case 'text':
    case 'label':
      return <p className="element-text">{node.props.text}</p>;
    case 'link':
      return <a href={node.props.href || '#'}>{node.props.text}</a>;
    case 'icon':
      return (
        <span role="img" aria-label={node.props.text} className="element-standalone-icon">
          <Icon size={28} />
        </span>
      );
    case 'image':
      return exportedAssets?.[node.id]?.src ? (
        <img src={exportedAssets[node.id].src} alt={node.props.text} />
      ) : node.props.attachment ? (
        <FileImage node={node} />
      ) : node.props.src && !imageFailed ? (
        <img src={node.props.src} alt={node.props.text} onError={() => setImageFailed(true)} />
      ) : (
        <div className="element-image-placeholder">
          <Image size={40} />
          <span>{imageFailed ? '이미지를 불러올 수 없습니다.' : node.props.text}</span>
        </div>
      );
    case 'spacer':
      return (
        <div className="element-spacer">
          <span className="spacer-guide-text">여백</span>
        </div>
      );
    case 'divider':
      return <hr />;
    case 'button':
    case 'iconButton':
    case 'fab':
    case 'toggleButton': {
      const nodeType = node.type as string;
      const variant =
        nodeType === 'fab'
          ? 'fab'
          : nodeType === 'iconButton'
            ? 'icon'
            : (node.props.variant ?? 'default');
      const isIconOnly = variant === 'icon' || variant === 'fab';
      const isFab = variant === 'fab';
      return (
        <button
          type="button"
          className={`element-button variant-${variant} ${isFab ? 'element-fab' : ''} ${isIconOnly ? 'element-icon-button' : ''}`}
          disabled={node.props.disabled}
          aria-pressed={pressed}
          onClick={() => setPressed((v) => !v)}
        >
          {node.props.iconName && node.props.iconName !== 'none' && (
            <span className="button-icon-wrapper">
              <Icon size={isFab ? 24 : 16} />
            </span>
          )}
          {!isIconOnly && <span className="button-text">{node.props.text}</span>}
        </button>
      );
    }
    case 'dropdownButton':
      return (
        <label>
          {node.props.text}
          <select disabled={node.props.disabled}>
            {(node.props.items ?? '').split('\n').map((option, i) => (
              <option key={i}>{option}</option>
            ))}
          </select>
        </label>
      );
    case 'alert': {
      const stateType = node.props.stateType ?? 'info';
      const AlertIcon =
        stateType === 'error'
          ? AlertCircle
          : stateType === 'warning'
            ? AlertCircle
            : stateType === 'success'
              ? CheckCircle2
              : Info;
      return (
        <div className={`element-alert alert-${stateType}`} role="status">
          <AlertIcon size={18} className="alert-icon" />
          <span className="alert-message">{node.props.text}</span>
        </div>
      );
    }
    case 'progress': {
      const value = node.props.value ?? 60;
      if (node.props.shape === 'circle') {
        const radius = 24;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - value / 100);
        return (
          <div className="element-progress-circle">
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={radius} className="circle-track" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="circle-indicator"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="circle-label">
              <strong>{value}%</strong>
            </div>
            {node.props.text && <small className="progress-text">{node.props.text}</small>}
          </div>
        );
      }
      return (
        <div className="element-progress-bar-wrap">
          <div className="progress-info">
            <span>{node.props.text}</span>
            <span>{value}%</span>
          </div>
          <progress max={100} value={value} />
        </div>
      );
    }
    case 'spinner':
      return (
        <div role="status" className="element-loading">
          <span className="element-spinner" />
          {node.props.text}
        </div>
      );
    case 'skeleton': {
      const shape = node.props.shape ?? 'lines';
      if (shape === 'circle') {
        return (
          <div
            aria-label={node.props.text}
            role="status"
            className="element-skeleton skeleton-circle-wrap"
          >
            <div className="skeleton-circle" />
            <div className="skeleton-lines">
              <i style={{ width: '80%' }} />
              <i style={{ width: '50%' }} />
            </div>
          </div>
        );
      }
      if (shape === 'card') {
        return (
          <div
            aria-label={node.props.text}
            role="status"
            className="element-skeleton skeleton-card-wrap"
          >
            <div className="skeleton-thumbnail" />
            <div className="skeleton-lines">
              <i style={{ width: '90%' }} />
              <i style={{ width: '60%' }} />
            </div>
          </div>
        );
      }
      return (
        <div aria-label={node.props.text} role="status" className="element-skeleton skeleton-lines">
          <i style={{ width: '100%' }} />
          <i style={{ width: '85%' }} />
          <i style={{ width: '60%' }} />
        </div>
      );
    }
    case 'emptyState':
    case 'errorState': {
      const nodeType = node.type as string;
      const stateType = nodeType === 'errorState' ? 'error' : (node.props.stateType ?? 'empty');
      const StateIcon =
        stateType === 'error' ? AlertCircle : stateType === 'success' ? CheckCircle2 : Inbox;
      return (
        <div className={`element-state state-${stateType}`}>
          <StateIcon size={36} />
          <p>{node.props.text}</p>
        </div>
      );
    }
    default:
      throw new Error(`렌더러가 없는 요소: ${node.type}`);
  }
}
