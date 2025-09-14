// src/pages/ProjectDiagrams.jsx (opcional)
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Diagrams from '../api/diagrams';

export default function ProjectDiagrams() {
  const { id: projectId } = useParams();
  const { token } = useAuth();
  const [diagrams, setDiagrams] = useState([]);

  useEffect(() => {
    (async () => {
      const list = await Diagrams.listProjectDiagrams(projectId, token);
      setDiagrams(list);
    })();
  }, [projectId, token]);

  return (
    <div className="container py-3">
      <h3>Diagramas del proyecto {projectId}</h3>
      <ul className="list-group">
        {diagrams.map(d => (
          <li key={d.id} className="list-group-item d-flex justify-content-between">
            <span>{d.name}</span>
            <Link className="btn btn-sm btn-outline-primary" to={`/diagram/${d.id}`}>Abrir</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
