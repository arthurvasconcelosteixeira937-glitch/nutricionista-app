import { NavLink } from 'react-router-dom'

export default function NavInferior() {
  return (
    <nav className="nav-inferior">
      <NavLink to="/" end>
        <span className="nav-icone">🏠</span>
        Painel
      </NavLink>
      <NavLink to="/alunos">
        <span className="nav-icone">👥</span>
        Alunos
      </NavLink>
      <NavLink to="/conta">
        <span className="nav-icone">👤</span>
        Minha conta
      </NavLink>
    </nav>
  )
}
