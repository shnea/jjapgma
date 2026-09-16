import { useEffect, useState } from 'react';
import { api, errorMessage, type Project } from '../../lib/api';

export function ProjectSelect({
  projects,
  value,
  onChange,
  disabled = false,
}: {
  projects: Pick<Project, 'id' | 'name' | 'role'>[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="project-switcher"
      aria-label="프로젝트 전환"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">전체 프로젝트</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
          {project.role !== 'OWNER' ? ' · 공유받음' : ''}
        </option>
      ))}
    </select>
  );
}

export function ProjectSwitcher({ project }: { project: Project | undefined }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => {
      void api<Project[]>('/projects')
        .then((list) => {
          if (active) {
            setProjects(list);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('project-access-changed', load);
    return () => {
      active = false;
      window.removeEventListener('focus', load);
      window.removeEventListener('project-access-changed', load);
    };
  }, []);
  const options =
    project && !projects.some((item) => item.id === project.id) ? [project, ...projects] : projects;
  return (
    <div className="project-switcher-wrap">
      <ProjectSelect
        projects={options}
        value={project?.id ?? ''}
        disabled={!project}
        onChange={(id) => {
          if (id !== project?.id) window.location.assign(id ? `/projects/${id}` : '/');
        }}
      />
      {error && (
        <span className="error-text" role="alert">
          프로젝트 목록을 불러오지 못했습니다.
        </span>
      )}
    </div>
  );
}
