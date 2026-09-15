import { useState, type ElementType } from 'react';
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
} from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileImage } from '../files/FileAssets';
export function BasicElement({ node }: { node: UiNode }) {
  const [pressed, setPressed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = ({ size = 28 }: { size?: number }) => {
    const icons = {
      plus: Plus,
      star: Star,
      heart: Heart,
      search: Search,
      settings: Settings,
      check: Check,
      x: X,
    };
    const Component = icons[node.props.iconName as keyof typeof icons] ?? Star;
    return <Component size={size} />;
  };
  switch (node.type) {
    case 'heading': {
      const Tag = (node.props.titleLevel ?? 'h2') as ElementType;
      return <Tag>{node.props.text}</Tag>;
    }
    case 'text':
      return <p>{node.props.text}</p>;
    case 'label':
      return <span>{node.props.text}</span>;
    case 'link':
      return <a href={node.props.href || '#'}>{node.props.text}</a>;
    case 'icon':
      return (
        <span role="img" aria-label={node.props.text}>
          <Icon />
        </span>
      );
    case 'image':
      return node.props.attachment ? (
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
      return <div className="element-spacer" />;
    case 'divider':
      return <hr />;
    case 'button':
      return (
        <button type="button" disabled={node.props.disabled}>
          {node.props.text}
        </button>
      );
    case 'iconButton':
    case 'fab':
      return (
        <button
          className="element-icon-button"
          type="button"
          aria-label={node.props.text}
          disabled={node.props.disabled}
        >
          <Icon size={24} />
        </button>
      );
    case 'toggleButton':
      return (
        <button
          type="button"
          aria-pressed={pressed}
          disabled={node.props.disabled}
          onClick={() => setPressed((v) => !v)}
        >
          <Icon size={16} />
          {node.props.text}
        </button>
      );
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
    case 'alert':
      return (
        <div className="element-alert" role="status">
          <AlertCircle size={20} />
          {node.props.text}
        </div>
      );
    case 'progress':
      return (
        <label>
          {node.props.text}
          <progress max={100} value={node.props.value ?? 60} />
        </label>
      );
    case 'spinner':
      return (
        <div role="status" className="element-loading">
          <span className="element-spinner" />
          {node.props.text}
        </div>
      );
    case 'skeleton':
      return (
        <div aria-label={node.props.text} role="status" className="element-skeleton">
          <i />
          <i />
          <i />
        </div>
      );
    case 'emptyState':
    case 'errorState':
      return (
        <div className="element-state">
          {node.type === 'emptyState' ? <Inbox size={36} /> : <AlertCircle size={36} />}
          <p>{node.props.text}</p>
        </div>
      );
    default:
      throw new Error(`렌더러가 없는 요소: ${node.type}`);
  }
}
