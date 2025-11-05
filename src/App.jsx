import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// --- ARQUIVO: firebase.js (EMBUTIDO) ---
const firebaseConfig = {
  apiKey: "AIzaSyCU8gB21qsHCJ4oHniFJkN4KrIVyiz-t8w",
  authDomain: "fgcbrasil-banco.firebaseapp.com",
  projectId: "fgcbrasil-banco",
  storageBucket: "fgcbrasil-banco.firebasestorage.app",
  messagingSenderId: "891150279225",
  appId: "1:891150279225:web:e08068726d02da2abc23e8",
  measurementId: "G-5BEK0HGZ6W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ARQUIVO: AuthContext.js (EMBUTIDO) ---
const AuthContext = createContext();
const useAuth = () => {
  return useContext(AuthContext);
};

// --- PROVEDOR DE AUTENTICAÇÃO ---
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userDocRef,
          (doc) => {
            if (doc.exists()) {
              setUserData(doc.data());
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("onSnapshot Erro:", error);
            setUserData(null);
            setLoading(false);
          }
        );
        return () => unsubscribeDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const value = { user, userData, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// --- COMPONENTE PRINCIPAL (O ROTEADOR) ---
function AppContent() {
  const [page, setPage] = useState('home'); 
  const { user, userData, loading } = useAuth(); 

  // Verifica se estamos na Rifa para esconder os banners laterais
  const isRifaPage = page === 'rifa';

  if (loading) {
    return <LoadingSpinner text="Carregando Autenticação..." />
  }
  
  const renderPage = () => {
    // ... (toda a sua lógica 'switch (page)' continua aqui, sem mudança) ...
    if (user && userData) {
      // Logado e com dados
      switch (page) {
        case 'dashboard':
          return <DashboardPage setPage={setPage} />;
        case 'ranking':
          return <RankingPage setPage={setPage} />;
        case 'championships':
          return <ChampionshipsPage setPage={setPage} />;
        
        case 'streamers':
          if (userData.tipo === 'fã') return <StreamersPage setPage={setPage} />;
          return <DashboardPage setPage={setPage} />;
        case 'missões':
          if (userData.tipo === 'fã') return <MissaoPage setPage={setPage} />;
          return <DashboardPage setPage={setPage} />;
        
        case 'rifa': 
          return <RifaPage setPage={setPage} />;
          
        case 'admin':
          if (userData.admin === true && userData.tipo === 'admin') { 
            return <AdminPage setPage={setPage} />;
          }
          return <DashboardPage setPage={setPage} />; 
        
        default:
          return <DashboardPage setPage={setPage} />; 
      }
    } else if (user && !userData) {
      // Logado mas sem dados (ex: registro)
       return <LoadingSpinner text="Finalizando registro..." />
    } else {
      // Não logado (user=null)
      return <LoginPage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light font-sans relative">      
      <LeftSponsorBanner />
      <RightSponsorBanner />      
      <Navbar setPage={setPage} />
      <main className="container mx-auto p-4 md:p-8 px-12 lg:px-48">
        {renderPage()}
      </main>
    </div>
  );
}

// --- COMPONENTE "MÃE" ---
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// --- COMPONENTES DE UI GENÉRICOS ---

// --- Navbar ---
function Navbar({ setPage }) {
  const { user, userData } = useAuth();
  const handleLogout = async () => {
    await signOut(auth);
    setPage('login');
  };

  // Esta função decide quais links mostrar
  const renderNavLinks = () => {
    // Se não estiver logado
    if (!user || !userData) {
      return <Button primary onClick={() => setPage('login')}>Login / Registro</Button>;
    }

    // Se for Admin Global (tipo 'admin' E admin:true)
    if (userData.admin === true && userData.tipo === 'admin') {
      return (
        <>
          <NavLink onClick={() => setPage('dashboard')}>Dashboard</NavLink>
          <NavLink onClick={() => setPage('championships')}>Organizações</NavLink>
          <NavLink onClick={() => setPage('ranking')}>Ranking</NavLink>
          <NavLink onClick={() => setPage('rifa')}>Rifa</NavLink>
          <NavLink onClick={() => setPage('admin')}>
            <span className="text-teal-300 font-bold">Admin</span>
          </NavLink>
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }
    
    // Se for Jogador OU Organizador (eles veem o mesmo)
    if (userData.tipo === 'jogador' || userData.tipo === 'organizador') {
       return (
        <>
          <NavLink onClick={() => setPage('dashboard')}>Dashboard</NavLink>
          <NavLink onClick={() => setPage('championships')}>Organizações</NavLink>
          <NavLink onClick={() => setPage('ranking')}>Ranking</NavLink>
          <NavLink onClick={() => setPage('rifa')}>Rifa</NavLink>
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }
    
    // Se for Fã
    if (userData.tipo === 'fã') {
       return (
        <>
          <NavLink onClick={() => setPage('dashboard')}>Dashboard</NavLink>
          <NavLink onClick={() => setPage('championships')}>Organizações</NavLink>
          <NavLink onClick={() => setPage('streamers')}>Streamers</NavLink>
          <NavLink onClick={() => setPage('missões')}>Missões</NavLink>
          <NavLink onClick={() => setPage('ranking')}>Ranking</NavLink>
          <NavLink onClick={() => setPage('rifa')}>Rifa</NavLink>
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }

    // Fallback
    return <Button onClick={handleLogout}>Sair</Button>;
  };

  return (
    <nav className="bg-gray-800 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="text-2xl font-bold text-white cursor-pointer" onClick={() => setPage(user ? 'dashboard' : 'home')}>
            <span className="text-purple-400">FGC</span>Brasil
          </div>
          <div className="flex items-center space-x-4">
            {renderNavLinks()}
          </div>
        </div>
      </div>
    </nav>
  );
}

const NavLink = ({ children, onClick }) => (
  <button onClick={onClick} className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition">
    {children}
  </button>
);

const Input = ({ label, type = 'text', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
    <input
      type={type}
      {...props}
      className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${props.className || ''}`}
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <select {...props} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
      {children}
    </select>
  </div>
);

const Button = ({ children, primary = false, ...props }) => {
  const baseClasses = "font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md w-full disabled:opacity-50";
  const primaryClasses = "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700";
  const secondaryClasses = "bg-gray-600 text-gray-200 hover:bg-gray-500";
  return (
    <button {...props} className={`${baseClasses} ${primary ? primaryClasses : secondaryClasses}`}>
      {children}
    </button>
  );
};

const StatCard = ({ title, value, subtitle = '' }) => (
  <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-center">
    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
    <p className="text-4xl font-extrabold text-white mt-2">{value}</p>
    {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
  </div>
);

const LoadingSpinner = ({ text = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-brand-dark">
    <div className="w-12 h-12 border-4 border-t-purple-500 border-gray-700 rounded-full animate-spin"></div>
    <p className="mt-4 text-lg text-gray-400">{text}</p>
  </div>
);

const TabButton = ({ title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-6 font-semibold transition text-center ${isActive
        ? 'border-b-2 border-purple-500 text-white'
        : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
      }`}
  >
    {title}
  </button>
);

const Textarea = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${props.className || ''}`}
    />
  </div>
);

function PlayerMultiSelect({ label, players, selectedPlayers, onSelect, onDeselect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredPlayers = players.filter(player => {
    const isNotSelected = !selectedPlayers.find(p => p.id === player.id);
    const matchesSearch = player.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.id.toLowerCase().includes(searchTerm.toLowerCase());
    return isNotSelected && matchesSearch;
  });
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 p-2 bg-gray-700 rounded-t-lg border-b border-gray-600 min-h-[40px]">
        {selectedPlayers.length === 0 && (
          <span className="text-sm text-gray-500 italic px-2 py-1">Nenhum jogador selecionado...</span>
        )}
        {selectedPlayers.map(player => (
          <span key={player.id} className="flex items-center bg-purple-600 text-white text-sm font-medium px-3 py-1 rounded-full cursor-pointer" onClick={() => onDeselect(player)}>
            {player.nome}
            <span className="ml-2 text-purple-200 hover:text-white font-bold">×</span>
          </span>
        ))}
      </div>
      <Input type="text" placeholder="Buscar por nome ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="rounded-t-none" />
      {searchTerm && (
        <div className="max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-b-lg shadow-lg">
          {filteredPlayers.length === 0 && (
            <p className="text-gray-400 text-sm p-3">Nenhum jogador encontrado.</p>
          )}
          {filteredPlayers.map(player => (
            <div key={player.id} className="p-3 hover:bg-purple-700 cursor-pointer text-sm" onClick={() => { onSelect(player); setSearchTerm(''); }}>
              {player.nome} <span className="text-gray-400">({player.id})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CostsModal({ onClose }) {
  return (
    // Fundo do Modal
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Fecha ao clicar fora
    >
      {/* Conteúdo do Modal */}
      <div 
        className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Impede de fechar ao clicar dentro
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-white">Custos Operacionais</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
        </div>
        
        <div className="space-y-4 text-gray-300">
          <p>
            Manter uma plataforma como a FGC Brasil ativa 24/7 envolve custos reais. Queremos ser 100% transparentes sobre para onde vai o apoio da comunidade:
          </p>
          
          {/* Item 1: Servidor/Backend */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-700 p-4 rounded-lg">
            <img 
              src="https://placehold.co/200x150/1a202c/6f42c1?text=Servidor+Cloud" 
              alt="Servidor" 
              className="w-full md:w-1/3 h-auto object-cover rounded-lg"
            />
            <div className="flex-1">
              <h4 className="text-xl font-semibold text-white">Servidor e Banco de Dados</h4>
              <p className="text-sm">
                Usamos o Firebase para garantir que os rankings sejam em tempo real. Isso inclui custos de hospedagem (backend), banco de dados (Firestore) e autenticação de usuários.
              </p>
            </div>
          </div>
          
          {/* Item 2: Desenvolvimento */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-700 p-4 rounded-lg">
            <img 
              src="https://placehold.co/200x150/1a202c/20c997?text=Manuten%C3%A7%C3%A3o" 
              alt="Desenvolvimento" 
              className="w-full md:w-1/3 h-auto object-cover rounded-lg"
            />
            <div className="flex-1">
              <h4 className="text-xl font-semibold text-white">Desenvolvimento e Manutenção</h4>
              <p className="text-sm">
                Novas funcionalidades (como a Página de Rifas, Missões) e a correção de bugs exigem horas de desenvolvimento contínuo para manter a plataforma moderna e segura.
              </p>
            </div>
          </div>
          
          <p className="mt-4 text-center">
            Cada doação de Fã ajuda a cobrir esses custos e a manter a comunidade crescendo!
          </p>
        </div>
        
      </div>
    </div>
  );
}

function CostsCard({ onOpenModal }) {
  return (
    // Adicionado "flex flex-col items-center text-center"
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center text-center">
      <h3 className="text-2xl font-semibold mb-4">Transparência da Plataforma</h3>
      <p className="text-gray-400 mb-6">
        A FGC Brasil é um projeto mantido pela comunidade. Veja como seu apoio é fundamental para mantermos as luzes acesas e os rankings atualizados.
      </p>
      <Button primary onClick={onOpenModal}>
        Clique para saber os detalhes
      </Button>
    </div>
  );
}

//Patrocinadores
// Banner da Esquerda (Fixo)
function LeftSponsorBanner() {
  // Nota: 'hidden lg:block' esconde o banner em telas pequenas/médias
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40">
      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador1.jpg" // Caminho do Asset
          alt="Patrocinador 1" 
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>      
      <a href="#" target="_blank" rel="noopener noreferrer" className="mt-6 block">
        <img 
          src="/assets/patrocinador2.jpg" 
          alt="Patrocinador 2" 
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>
      <a href="#" target="_blank" rel="noopener noreferrer" className="mt-6 block">
        <img 
          src="/assets/patrocinador3.jpg" 
          alt="Patrocinador 3" 
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>
    </div>
  );
}

// Banner da Direita (Fixo)
function RightSponsorBanner() {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador3.jpg" // Caminho do Asset
          alt="Patrocinador 3" 
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>      
      <a href="#" target="_blank" rel="noopener noreferrer" className="mt-6 block">
        <img 
          src="/assets/patrocinador4.jpg" 
          alt="Patrocinador 4"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>
      <a href="#" target="_blank" rel="noopener noreferrer" className="mt-6 block">
        <img 
          src="/assets/patrocinador4.jpg" 
          alt="Patrocinador 4"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg" 
        />
      </a>
    </div>
  );
}

// Banners da Rifa (Em linha, no final da página)
function RifaSponsorBanners() {
  return (
    <div className="mt-12 pt-8 border-t border-gray-700">
      <h3 className="text-xl font-semibold text-center text-gray-400 mb-6">Nossos Patrocinadores</h3>
      {/* Ajuste 'justify-center' para 'justify-between' se preferir */}
      <div className="flex flex-wrap justify-center lg:justify-around items-center gap-6">
        
        <a href="#" target="_blank" rel="noopener noreferrer" title="Patrocinador 1">
          <img src="/assets/patrocinador1.jpg" alt="Patrocinador Rifa 1" className="h-16 lg:h-20 w-auto object-contain"/>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" title="Patrocinador 2">
          <img src="/assets/patrocinador1.jpg" alt="Patrocinador Rifa 2" className="h-16 lg:h-20 w-auto object-contain"/>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" title="Patrocinador 3">
          <img src="/assets/patrocinador1.jpg" alt="Patrocinador Rifa 3" className="h-16 lg:h-20 w-auto object-contain"/>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" title="Patrocinador 4">
          <img src="/assets/patrocinador1.jpg" alt="Patrocinador Rifa 4" className="h-16 lg:h-20 w-auto object-contain"/>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" title="Patrocinador 4">
          <img src="/assets/patrocinador1.jpg" alt="Patrocinador Rifa 4" className="h-16 lg:h-20 w-auto object-contain"/>
        </a>   
      </div>
    </div>
  );
}

// Componente de busca de usuário para SELEÇÃO ÚNICA
function UserSearchSelect({ label, users, selectedUser, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filtra usuários que correspondem à busca
  const filteredUsers = searchTerm
    ? users.filter(user =>
        (user.nome && user.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.id && user.id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : users;
    
  const selectedUserName = users.find(u => u.id === selectedUser)?.nome || 'Selecione um usuário...';

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      
      {/* O "Input" Falso que mostra o usuário selecionado */}
      <div 
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedUserName}
      </div>
      
      {/* Dropdown com o filtro */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Input de Busca */}
          <div className="p-2 border-b border-gray-600">
            <Input 
              type="text" 
              placeholder="Buscar por nome ou ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          {/* Lista de Resultados */}
          <div>
            {filteredUsers.length === 0 && <p className="text-gray-400 p-3">Nenhum usuário encontrado.</p>}
            {filteredUsers.map(user => (
              <div 
                key={user.id}
                className="p-3 hover:bg-purple-700 cursor-pointer text-sm"
                onClick={() => {
                  onSelect(user.id); // Envia o ID
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {user.nome} <span className="text-gray-400">({user.id})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFriendlyAuthError(code) {
  switch (code) {
    case 'auth/user-not-found': return 'Usuário não encontrado.';
    case 'auth/wrong-password': return 'Senha incorreta.';
    case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
    case 'auth/weak-password': return 'Senha muito fraca.';
    case 'auth/invalid-email': return 'E-mail inválido.';
    default: return 'Ocorreu um erro.';
  }
}

// --- PÁGINAS ---

// --- PÁGINA DE LOGIN (MODIFICADA) ---
function LoginPage({ setPage }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('jogador'); // <-- Valor padrão
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setPage('dashboard');
      } catch (err) {
        setError(getFriendlyAuthError(err.code));
      }
    } else {
      if (!nome) {
        setError("Por favor, informe seu nome ou nick.");
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // A rota /api/users/register agora lida com a criação da organização
        await fetch('http://localhost:3001/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid, email: user.email, nome: nome, tipo: tipo
          })
        });
        setPage('dashboard');
      } catch (err) {
        setError(getFriendlyAuthError(err.code));
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl shadow-2xl shadow-purple-500/20">
      <h2 className="text-3xl font-bold text-center text-white mb-6">
        {isLogin ? 'Entrar na Plataforma' : 'Criar Conta'}
      </h2>
      <form onSubmit={handleAuth}>
        {!isLogin && (
          <>
            <Input label="Nome / Nick" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Eu sou:</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="jogador">Jogador</option>
                <option value="fã">Fã / Espectador</option>
                <option value="organizador">Organizador</option> {/* <-- OPÇÃO ADICIONADA */}
              </select>
            </div>
          </>
        )}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 shadow-lg">
          {isLogin ? 'Login' : 'Registrar'}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-center text-gray-400 hover:text-white transition">
        {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
      </button>
    </div>
  );
}

// DADOS MOCK PARA A PÁGINA DE STREAMERS
const mockStreamers = [
  {
    id: 's1',
    nome: 'Baiano',
    img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/a73b53f6-2611-4efa-b74c-4e8992f0c78a-profile_image-300x300.png',
    games: ['LoL', 'TFT'],
    twitch: 'https://www.twitch.tv/baiano',
    insta: 'https://www.instagram.com/baianolol'
  },
  {
    id: 's2',
    nome: 'Gaules',
    img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/f4b12683-57ff-4b57-9d36-601439e767e3-profile_image-300x300.png',
    games: ['CS2', 'F1'],
    twitch: 'https://www.twitch.tv/gaules',
    insta: 'https://www.instagram.com/gaules'
  },
  {
    id: 's3',
    nome: 'Coringa',
    img: 'https://static-cdn.jtvnw.net/jtv_user_pictures/c6e3b08e-329b-4e08-8f81-f2f01f8101d2-profile_image-300x300.png',
    games: ['GTA RP', 'LoL'],
    twitch: 'https://www.twitch.tv/loud_coringa',
    insta: 'https://www.instagram.com/loud_coringa'
  },
];

//Página streamers
function StreamersPage() {
  // Helper para os botões de link
  const LinkButton = ({ href, children, className }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md w-full text-center ${className}`}
    >
      {children}
    </a>
  );

  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8">Streamers da Comunidade</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStreamers.map(streamer => (
          <div key={streamer.id} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
            <img src={streamer.img} alt={streamer.nome} className="w-full h-48 object-cover" />
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold text-white mb-2">{streamer.nome}</h3>
              <div className="flex gap-2 mb-4">
                {streamer.games.map(game => (
                  <span key={game} className="bg-purple-600 text-xs text-white px-2 py-1 rounded-full font-semibold">{game}</span>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <LinkButton href={streamer.twitch} className="bg-purple-700 text-white hover:bg-purple-600">
                  Twitch
                </LinkButton>
                <LinkButton href={streamer.insta} className="bg-pink-600 text-white hover:bg-pink-500">
                  Instagram
                </LinkButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- (ADICIONE ESTES DOIS NOVOS COMPONENTES DE PÁGINA) ---

// Este é o formulário que SÓ o Admin verá
function AdminRifaForm({ onParticipanteAdded, allUsers }) { // Recebe allUsers
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState(''); // Estado para o ID
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setMessage('Erro: Você deve selecionar um usuário.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/rifa/add-participante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ jogadorId: selectedUserId }) // Envia o ID
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar');
      
      setMessage(data.message);
      setSelectedUserId(''); // Limpa o seletor
      onParticipanteAdded(); // Recarrega a lista
      
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-700 p-4 rounded-lg mb-6">
      <h4 className="text-lg font-semibold text-white mb-3">Adicionar Cota (Nº Automático)</h4>
      {message && (
        <p className={`text-center mb-2 text-sm ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>
          {message}
        </p>
      )}
      
      <UserSearchSelect
        label="Comprador"
        users={allUsers}
        selectedUser={selectedUserId}
        onSelect={setSelectedUserId}
      />
      
      <Button primary type="submit" disabled={loading || allUsers.length === 0}>
        {loading ? 'Adicionando...' : 'Adicionar Cota'}
      </Button>
    </form>
  );
}

// Página da Rifa
function RifaPage() {
  const { user, userData } = useAuth();
  const [rifa, setRifa] = useState(null);
  const [allUsers, setAllUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = userData?.admin === true && userData?.tipo === 'admin';

  const fetchRifa = async () => {
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/rifa/atual');
      const data = await res.json();
      if (res.ok) {
        if (data.participantes) data.participantes.sort((a, b) => a.numero - b.numero);
        setRifa(data);
      } else {
        throw new Error(data.error || 'Erro ao buscar rifa');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRifa();
    if (isAdmin) {
      const fetchAllUsers = async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch('http://localhost:3001/api/users/all', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setAllUsers(data);
        } catch (err) {
          console.error("Erro ao buscar usuários:", err);
        }
      };
      fetchAllUsers();
    }
  }, [isAdmin, user]); 

  const handleResetRifa = async () => {
    if (!window.confirm("Você tem CERTEZA que quer apagar TODAS as cotas desta rifa? Esta ação é irreversível.")) {
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/rifa/reset', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar');
      alert(data.message);
      fetchRifa(); 
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner text="Carregando Rifa..." />;
  
  if (error || !rifa) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Página da Rifa</h1>
        <div className="bg-gray-800 p-10 rounded-xl shadow-lg text-center">
          <h3 className="text-2xl font-semibold text-white mb-4">Nenhuma Rifa Ativa</h3>
          <p className="text-gray-300">{error || "Não há nenhuma rifa ativa no momento. Volte mais tarde!"}</p>
          {isAdmin && (
            <p className="text-teal-300 mt-4 italic">
              Admin: Para ativar a rifa, crie um documento com o ID "atual" na coleção "rifas" do Firestore.
            </p>
          )}
        </div>
        
        {/* Adiciona o banner da rifa mesmo se ela não for encontrada */}
        <RifaSponsorBanners />
        
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8 text-center">{rifa.titulo}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda: Detalhes e Pagamento */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <img 
              src={rifa.imagemUrl || 'https://placehold.co/800x400/1a202c/6f42c1?text=Imagem+da+Rifa'} 
              alt="Prêmio da Rifa" 
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h3 className="text-2xl font-semibold text-white mb-4">Sobre o Prêmio</h3>
              <p className="text-gray-300 whitespace-pre-line">{rifa.descricao || "Descrição do prêmio..."}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-semibold text-white mb-4">Como Participar</h3>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <img 
                src={rifa.qrCodeUrl || 'https://placehold.co/200x200/ffffff/000000?text=QR+Code+PIX'} 
                alt="QR Code PIX" 
                className="w-48 h-48 rounded-lg"
              />
              <p className="text-gray-300 whitespace-pre-line flex-1">
                {rifa.pagamentoDesc || "Instruções de pagamento..."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Coluna Direita: Cotas e Admin */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col">
          <h3 className="text-2xl font-semibold text-white mb-4">Cotas Compradas</h3>
          
          {isAdmin && (
            <AdminRifaForm 
              onParticipanteAdded={fetchRifa} 
              allUsers={allUsers} 
            />
          )}
          
          <div className="max-h-96 lg:max-h-[600px] overflow-y-auto mt-4 border border-gray-700 rounded-lg flex-grow">
            {rifa.participantes.length === 0 && (
              <p className="text-gray-400 p-4 text-center italic">Nenhuma cota comprada ainda. Seja o primeiro!</p>
            )}
            <ul className="divide-y divide-gray-700">
              {rifa.participantes.map(p => (
                <li key={`${p.numero}-${p.nome}`} className="flex justify-between items-center p-3">
                  <span className="text-sm font-medium text-gray-400 bg-gray-900 px-2 py-0.5 rounded-md">
                    Nº {p.numero}
                  </span>
                  <span className="text-lg font-semibold text-white truncate ml-2">{p.nome}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {isAdmin && (
            <div className="mt-4">
              <Button 
                onClick={handleResetRifa} 
                className="bg-red-700 text-white hover:bg-red-600 w-full"
                disabled={loading}
              >
                Resetar Rifa (Limpar Cotas)
              </Button>
            </div>
          )}
          
        </div>
      
      </div>
      
      {/* --- BANNER ADICIONADO AO FINAL --- */}
      <RifaSponsorBanners />
      
    </div>
  );
}

// (Este é o card para UMA missão)
function MissionCard({ mission, onComplete }) {
  const { user } = useAuth();
  
  // Estado para saber se o botão de confirmar deve aparecer
  // Usamos sessionStorage para "lembrar" que o usuário clicou no link
  const [clickedLink, setClickedLink] = useState(
    sessionStorage.getItem(mission.id) === 'true'
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Usuário clica para ir ao site externo
  const handleLinkClick = () => {
    // Salva no sessionStorage para "lembrar"
    sessionStorage.setItem(mission.id, 'true');
    setClickedLink(true);
    // Abre o link em uma nova aba
    window.open(mission.url, '_blank');
  };

  // 2. Usuário clica para confirmar
  const handleConfirmClick = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ missionId: mission.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar');
      
      setSuccess(data.message); // Ex: "Missão completada! +50 XP"
      
      // Remove do sessionStorage
      sessionStorage.removeItem(mission.id);
      
      // Avisa a página pai (MissaoPage) que esta missão foi completada
      // para que ela possa ser removida da lista.
      setTimeout(onComplete, 1500); // Espera 1.5s para o usuário ler a msg
      
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Se a missão foi completada, mostra a mensagem de sucesso
  if (success) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-teal-500">
        <h3 className="text-xl font-semibold text-teal-300 mb-2">{mission.titulo}</h3>
        <p className="text-lg text-white text-center font-bold">{success}</p>
      </div>
    );
  }

  // Renderização normal da missão
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-2">{mission.titulo}</h3>
      <p className="text-gray-400 mb-4">Recompensa: <span className="text-teal-300 font-bold">{mission.xpRecompensa} XP</span></p>
      
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Botão de Ação (Ir para a Twitch) */}
        <Button 
          onClick={handleLinkClick}
          className="bg-purple-600 text-white hover:bg-purple-500 flex-1"
        >
          Ir para a Missão
        </Button>
        
        {/* Botão de Confirmação (Aparece após o clique) */}
        {clickedLink && (
          <Button 
            primary 
            onClick={handleConfirmClick}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Confirmando...' : 'Confirmo que cumpri a missão'}
          </Button>
        )}
      </div>
    </div>
  );
}

// --- MissaoPage ---
function MissaoPage() {
  const { user, userData } = useAuth(); // Pegamos o userData para filtrar
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Função para buscar as missões do backend
  const fetchMissions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/missions');
      const data = await res.json();
      if (res.ok) {
        setMissions(data);
      } else {
        throw new Error(data.error || 'Erro ao buscar missões');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Busca as missões quando a página carrega
  useEffect(() => {
    fetchMissions();
  }, []);

  // Filtra as missões:
  // Mostra apenas as que NÃO ESTÃO no array 'missoesCompletas' do usuário
  const availableMissions = missions.filter(
    m => !userData.missoesCompletas?.includes(m.id)
  );

  if (loading) return <LoadingSpinner text="Buscando Missões..." />;
  if (error) return <p className="text-red-400 text-center">{error}</p>;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Missões de Fã</h1>
      
      <div className="space-y-4">
        {availableMissions.length === 0 && (
          <div className="bg-gray-800 p-10 rounded-xl shadow-lg text-center">
            <h3 className="text-2xl font-semibold text-white mb-4">Nenhuma Missão Nova!</h3>
            <p className="text-gray-300">
              Você já completou todas as missões disponíveis. Volte mais tarde!
            </p>
          </div>
        )}
        
        {availableMissions.map(mission => (
          <MissionCard 
            key={mission.id} 
            mission={mission}
            onComplete={fetchMissions} // Recarrega a lista de missões ao completar
          />
        ))}
      </div>
    </div>
  );
}

// --- PÁGINA DASHBOARD ---
function DashboardPage({ setPage }) {
  const { userData } = useAuth();
  
  const [showCostsModal, setShowCostsModal] = useState(false);
  
  if (!userData) return <LoadingSpinner />;

  // Função para renderizar o dashboard específico do usuário
  const renderUserDashboard = () => {
    switch (userData.tipo) {
      case 'jogador':
        return <PlayerDashboard />;
      case 'fã':
        return <FanDashboard />;
      case 'organizador':
        return (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold mb-4">Dashboard de Organizador</h3>
            <p className="text-gray-400 mb-6">
              Bem-vindo! Você pode ver os rankings e as organizações.
            </p>
          </div>
        );
      case 'admin':
         return (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold mb-4">Dashboard de Admin Global</h3>
            <p className="text-gray-400 mb-6">Vá para a página de "Admin" para gerenciar toda a plataforma.</p>
            <Button primary onClick={() => setPage('admin')}>Ir para o Painel Admin</Button>
          </div>
         );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-2">Bem-vindo, {userData.nome}!</h1>
      <p className="text-xl text-gray-400 mb-8">Seu dashboard de {userData.tipo}.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Seu XP Total" value={userData.xpTotal.toFixed(2)} />
        <StatCard title="Ranking (Global)" value="#N/A" subtitle="Em breve" />
        <StatCard 
          title={userData.tipo === 'jogador' ? 'Campeonatos' : 'Contribuições'} 
          value={userData.tipo === 'jogador' ? userData.campeonatosParticipados.length : (userData.contribuicoes ? userData.contribuicoes.length : 0)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda (maior) */}
        <div className="lg:col-span-2">
          {renderUserDashboard()}
        </div>
        
        {/* Coluna Direita (menor) - MODIFICADA */}
        <div className="lg:col-span-1 space-y-6"> {/* Adiciona espaçamento entre os cards */}
          <CostsCard onOpenModal={() => setShowCostsModal(true)} />
          <ContactAdminCard /> {/* <-- CARD ADICIONADO AQUI */}
        </div>
        
      </div>

      {/* O Modal (renderização condicional) */}
      {showCostsModal && <CostsModal onClose={() => setShowCostsModal(false)} />}
    </div>
  );
}

// --- CARD MENSAGENS ---
function ContactAdminCard() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(''); // Mensagem de sucesso/erro

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/support/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      
      setFeedback(data.message);
      setSubject(''); // Limpa o formulário
      setMessage(''); // Limpa o formulário
    } catch (err) {
      setFeedback(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold mb-4">Fale com a Administração</h3>
      {feedback && (
        <p className={`text-center mb-4 text-sm ${feedback.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>
          {feedback}
        </p>
      )}
      <Input 
        label="Assunto" 
        type="text" 
        value={subject} 
        onChange={e => setSubject(e.target.value)} 
        required 
      />
      <Textarea 
        label="Mensagem" 
        value={message} 
        onChange={e => setMessage(e.target.value)} 
        required 
        rows="4"
        placeholder="Descreva seu problema ou sugestão..."
      />
      <Button primary type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar Mensagem'}
      </Button>
    </form>
  );
}

// (Componentes PlayerDashboard e FanDashboard sem mudanças)
function PlayerDashboard() {
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold mb-4">Ações de Jogador</h3>
      <p className="text-gray-400 mb-6">Aguarde o Admin lançar seus resultados.</p>
    </div>
  );
}
function FanDashboard() {
  const [valor, setValor] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const handleContribute = async () => {
    setLoading(true); setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ valor: Number(valor) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao contribuir');
      setMessage(data.message); setValor(10);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold mb-4">Apoie a Cena!</h3>
      <p className="text-gray-400 mb-6">Faça uma doação e ganhe XP de Fã. (R$ 1 = 10 XP)</p>
      {message && <p className="text-center text-teal-300 mb-4">{message}</p>}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <Input label="Valor (R$)" type="number" value={valor} onChange={e => setValor(e.target.value)} min="5" />
        <Button primary onClick={handleContribute} disabled={loading}>
          {loading ? 'Processando...' : `Contribuir R$ ${valor}`}
        </Button>
      </div>
    </div>
  );
}

// --- PÁGINA RANKING (Sem mudanças) ---
function RankingPage({ setPage }) {
  const [playerRanking, setPlayerRanking] = useState([]); // Estado para Jogadores
  const [fanRanking, setFanRanking] = useState([]);     // Estado para Fãs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch('http://localhost:3001/api/ranking');
        const data = await res.json();
        if (res.ok) {
          setPlayerRanking(data.players); // Seta o ranking de jogadores
          setFanRanking(data.fans);       // Seta o ranking de fãs
        }
        else throw new Error(data.error || 'Erro ao buscar ranking');
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchRanking();
  }, []);

  if (loading) return <LoadingSpinner text="Carregando Rankings..." />;
  
  // Se houver um erro, mostre-o.
  // (O erro de índice do Firestore aparecerá aqui)
  if (error) {
    return (
       <div className="animate-fade-in max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Rankings da Comunidade</h1>
        <div className="bg-gray-800 p-10 rounded-xl shadow-lg text-center">
          <h3 className="text-2xl font-semibold text-red-400 mb-4">Erro ao Carregar</h3>
          <p className="text-gray-300">{error}</p>
          <p className="text-gray-400 mt-4 italic">
            (Se este for um erro de "índice", verifique o terminal do seu **backend** para a URL de correção.)
          </p>
        </div>
      </div>
    )
  }

  // Componente helper interno para evitar repetição de código
  const RankingTable = ({ data, title }) => (
    <div className="bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
      <h3 className="text-2xl font-semibold text-white p-4">{title}</h3>
      <table className="w-full text-left">
        <thead className="bg-gray-700">
          <tr>
            <th className="p-4 text-lg font-semibold">Pos.</th>
            <th className="p-4 text-lg font-semibold">Nome</th>
            <th className="p-4 text-lg font-semibold">XP Total</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr><td colSpan="3" className="p-4 text-center text-gray-400">Ninguém classificado ainda.</td></tr>
          )}
          {data.map((item) => (
            <tr key={item.jogadorId} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
              <td className="p-4 text-xl font-bold text-purple-400">{item.posicao}</td>
              <td className="p-4 text-lg">{item.nome}</td>
              <td className="p-4 text-lg font-medium text-teal-300">{item.xpTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Renderiza a página com as duas tabelas
  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8">Rankings da Comunidade</h1>
      
      <div className="space-y-8"> {/* Adiciona espaço entre as tabelas */}
        <RankingTable title="Ranking de Jogadores" data={playerRanking} />
        <RankingTable title="Ranking de Fãs" data={fanRanking} />
      </div>
    </div>
  );
}

// (Página de Organizações)
function ChampionshipsPage({ setPage }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null); // Para o modal

  useEffect(() => {
    // Busca organizações, não campeonatos
    const fetchOrgs = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('http://localhost:3001/api/organizacoes');
        const data = await res.json();
        if (res.ok) {
          setOrgs(data);
        } else {
          throw new Error(data.error || 'Erro ao buscar organizações');
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchOrgs();
  }, []);

  if (loading) return <LoadingSpinner text="Carregando Organizações..." />;
  if (error) return <p className="text-red-400 text-center">{error}</p>

  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8">Campeonatos</h1>
      {orgs.length === 0 && <p className="text-gray-400 text-center">Nenhuma organização registrada ainda.</p>}

      {/* Cards das Organizações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-purple-500/30 transition duration-300 cursor-pointer"
            onClick={() => setSelectedOrg(org)}
          >
            <h3 className="text-2xl font-bold text-teal-300 mb-2">{org.nome}</h3>
            <p className="text-gray-300 mb-6 line-clamp-2">{org.descricao}</p>
            <Button>Ver Campeonatos</Button>
          </div>
        ))}
      </div>

      {/* O Modal (renderização condicional) */}
      {selectedOrg && (
        <ChampionshipsModal
          org={selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </div>
  );
}

// --- NOVO COMPONENTE: MODAL DE CAMPEONATOS ---
function ChampionshipsModal({ org, onClose }) {
  const [champs, setChamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Busca campeonatos da organização selecionada
    const fetchChamps = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:3001/api/organizacoes/${org.id}/championships`);
        const data = await res.json();
        if (res.ok) {
          setChamps(data);
        } else {
          throw new Error(data.error || 'Erro ao buscar campeonatos');
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchChamps();
  }, [org.id]); // Roda sempre que o 'org' mudar

  return (
    // Fundo do Modal
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Fecha ao clicar fora
    >
      {/* Conteúdo do Modal */}
      <div
        className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Impede de fechar ao clicar dentro
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-teal-300">Campeonatos de {org.nome}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
        </div>

        {loading && <LoadingSpinner text="Buscando campeonatos..." />}
        {error && <p className="text-red-400 text-center">{error}</p>}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {champs.length === 0 && <p className="text-gray-400">Nenhum campeonato encontrado para esta organização.</p>}

            {/* Lista de Campeonatos */}
            {champs.map(champ => (
              <div key={champ.id} className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-xl font-semibold text-white">{champ.nome}</h4>
                <p className="text-sm text-gray-400 mb-2">Data: {new Date(champ.data.seconds * 1000).toLocaleDateString('pt-BR')} | XP: {champ.xpTotal}</p>
                <p className="text-sm text-gray-300 mb-3">{champ.descricao}</p>

                {/* Lista de Resultados (Participantes) */}
                <h5 className="text-md font-semibold text-purple-300 mb-2">Resultados</h5>
                <div className="text-sm">
                  {champ.participantes.length === 0 && <p className="text-gray-400 italic">Resultados ainda não lançados.</p>}
                  {champ.participantes
                    .sort((a, b) => a.posicao - b.posicao) // Ordena por posição
                    .map(p => (
                      <div key={p.jogadorId} className="flex justify-between p-1 border-b border-gray-600 last:border-b-0">
                        <span className="text-gray-300">
                          {p.posicao <= 8 ? `${p.posicao}º` : '9º+'}
                        </span>
                        <span className="text-teal-300">+{p.xpGanho.toFixed(2)} XP</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// --- PÁGINA ADMIN ---
function AdminPage() {
  const [activeTab, setActiveTab] = useState('championships'); 
  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Painel de Administração</h1>
      <div className="flex flex-wrap mb-6 border-b border-gray-700">
        <TabButton title="Criar Campeonato" isActive={activeTab === 'championships'} onClick={() => setActiveTab('championships')}/>
        <TabButton title="Lançar Resultados" isActive={activeTab === 'results'} onClick={() => setActiveTab('results')}/>
        <TabButton title="Organizações" isActive={activeTab === 'organizations'} onClick={() => setActiveTab('organizations')}/>
        <TabButton title="Registrar Patrocínio" isActive={activeTab === 'donations'} onClick={() => setActiveTab('donations')}/>
      </div>
      <div>
        {activeTab === 'championships' && <CreateChampionshipForm />}
        {activeTab === 'donations' && <CreateDonationForm />}
        {activeTab === 'organizations' && <ManageOrganizationsForm />}
        
        {/* --- CONTEÚDO DA ABA ATUALIZADO --- */}
        {activeTab === 'results' && (
          <div className="space-y-10">
            {/* O formulário original (Padrão) */}
            <FinalizeChampionshipForm />
            
            {/* Divisor */}
            <hr className="border-gray-500 border-dashed" />
            
            {/* O novo formulário (Customizado) */}
            <FinalizeChampionshipFormCustom />
          </div>
        )}
        
      </div>
    </div>
  );
}

// (Formulário CreateChampionshipForm)
function CreateChampionshipForm() {
  const { user, userData } = useAuth(); 
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); 
  
  // 'xpTotal' agora é o OVERRIDE. Começa vazio.
  const [xpTotal, setXpTotal] = useState(''); 
  const [xpBaseAutomatico, setXpBaseAutomatico] = useState(1000); // O XP que vem da org
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Estados para o Admin Global
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [orgsList, setOrgsList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(''); 

  // Busca dados das organizações (para o select do Admin ou XP automático do Organizador)
  useEffect(() => {
    if (!userData) return;

    const fetchOrgsData = async () => {
      try {
        // Se for Admin Global, busca TODAS as orgs
        if (userData.admin === true && userData.tipo !== 'organizador') {
          setIsGlobalAdmin(true);
          const res = await fetch('http://localhost:3001/api/organizacoes');
          const data = await res.json();
          if (res.ok) {
            setOrgsList(data);
            if (data.length > 0) {
              setSelectedOrgId(data[0].id);
              setXpBaseAutomatico(data[0].xpBase || 1000); // Pega o XP da primeira org
            }
          }
        } 
        // Se for um Organizador, busca SÓ a sua org
        else if (userData.tipo === 'organizador' && userData.organizacaoId) {
          const res = await fetch(`http://localhost:3001/api/organizacoes/${userData.organizacaoId}`);
          const data = await res.json();
          if (res.ok) {
            setXpBaseAutomatico(data.xpBase || 1000); // Pega o XP da sua org
          }
        }
      } catch (err) {
        setMessage(`Erro ao buscar dados da organização: ${err.message}`);
      }
    };
    fetchOrgsData();
  }, [userData]); // Roda quando o userData é carregado

  // ATUALIZA O XP AUTOMÁTICO QUANDO O ADMIN GLOBAL MUDA A ORG
  useEffect(() => {
    if (isGlobalAdmin && orgsList.length > 0) {
      const orgSelecionada = orgsList.find(org => org.id === selectedOrgId);
      if (orgSelecionada) {
        setXpBaseAutomatico(orgSelecionada.xpBase || 1000);
      }
    }
  }, [selectedOrgId, isGlobalAdmin, orgsList]);

  const handleCreateChampionship = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    
    if (isGlobalAdmin && !selectedOrgId) {
      setMessage('Erro: Admin Global deve selecionar uma organização.');
      setLoading(false);
      return;
    }
    
    try {
      const token = await user.getIdToken();
      
      const body = { 
        nome, 
        descricao, 
        data, 
        // Envia o 'xpTotal' (override) apenas se ele for preenchido
        // Se estiver vazio, o backend usará o automático
        xpTotal: Number(xpTotal) > 0 ? Number(xpTotal) : null,
        organizadorId: isGlobalAdmin ? selectedOrgId : null 
      };
      
      const res = await fetch('http://localhost:3001/api/championships', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(body)
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao criar campeonato');
      setMessage(`Campeonato "${nome}" criado com sucesso!`);
      // Limpa formulário, inclusive o override de XP
      setNome(''); setDescricao(''); setXpTotal(''); 
      setData(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleCreateChampionship} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Novo Campeonato</h2>
      
      {isGlobalAdmin ? (
        <Select 
          label="Criar para a Organização:" 
          value={selectedOrgId} 
          onChange={e => setSelectedOrgId(e.target.value)}
        >
          {orgsList.length === 0 && <option>Carregando organizações...</option>}
          {orgsList.map(org => (
            <option key={org.id} value={org.id}>{org.nome}</option>
          ))}
        </Select>
      ) : (
        <p className="text-sm text-gray-400 mb-4 -mt-4">Seu campeonato será criado sob sua organização.</p>
      )}
      
      <Input label="Nome do Campeonato" type="text" value={nome} onChange={e => setNome(e.target.value)} required />
      <Input label="Descrição" type="text" value={descricao} onChange={e => setDescricao(e.target.value)} />
      <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} required />
      
      {/* --- INPUT DE XP MODIFICADO --- */}
      <Input 
        label="XP Base (Opcional - Override)" 
        type="number" 
        value={xpTotal} 
        onChange={e => setXpTotal(e.target.value)} 
        min="0"
        placeholder={`Automático: ${xpBaseAutomatico} XP`} // Mostra o XP automático
      />
      
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Button primary type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Campeonato'}</Button>
    </form>
  );
}
// Aba Organizações
function ManageOrganizationsForm() {
  const { user, userData } = useAuth();
  
  // Lista para o <select>
  const [orgsList, setOrgsList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    xpBase: 1000,
    imagemUrl: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [message, setMessage] = useState('');

  // Efeito para carregar as organizações (para o filtro/select)
  useEffect(() => {
    if (!userData) return;
    setLoadingOrgs(true);
    
    const fetchOrgs = async () => {
      try {
        // Se for Admin Global, busca TODAS
        if (userData.admin === true && userData.tipo !== 'organizador') {
          const res = await fetch('http://localhost:3001/api/organizacoes');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao buscar orgs');
          setOrgsList(data);
          if (data.length > 0) setSelectedOrgId(data[0].id); // Seleciona a primeira
        }
        // Se for Organizador, só pode editar a sua
        else if (userData.tipo === 'organizador' && userData.organizacaoId) {
          const res = await fetch(`http://localhost:3001/api/organizacoes/${userData.organizacaoId}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao buscar sua org');
          setOrgsList([data]); // A lista é só ele mesmo
          setSelectedOrgId(data.id);
        }
      } catch (err) {
        setMessage(`Erro: ${err.message}`);
      }
      setLoadingOrgs(false);
    };
    
    fetchOrgs();
  }, [userData]); // Roda quando o usuário carrega

  // Efeito para buscar os DADOS da organização selecionada e preencher o form
  useEffect(() => {
    if (!selectedOrgId) return;

    // Se a lista já tem os dados (como o xpBase), usa ela.
    const orgDataFromList = orgsList.find(o => o.id === selectedOrgId);
    if (orgDataFromList && orgDataFromList.xpBase) {
      setFormData(orgDataFromList);
    } else {
      // Se não, busca os dados completos (fallback)
      const fetchOrgData = async () => {
        try {
          const res = await fetch(`http://localhost:3001/api/organizacoes/${selectedOrgId}`);
          const data = await res.json();
          if (res.ok) setFormData(data);
        } catch (err) {
          setMessage(`Erro ao carregar dados: ${err.message}`);
        }
      };
      fetchOrgData();
    }
  }, [selectedOrgId, orgsList]);

  // Handler para atualizar os inputs do formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler para salvar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:3001/api/organizacoes/${selectedOrgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(formData) // Envia o estado do formulário
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao salvar');
      
      setMessage(resData.message);
      
      // Atualiza a lista (caso o nome tenha mudado)
      setOrgsList(prevList => prevList.map(org => 
        org.id === selectedOrgId ? formData : org
      ));
      
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  
  if (loadingOrgs) {
    return <LoadingSpinner text="Carregando organizações..." />
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Gerenciar Organização</h2>

      {/* Seletor de Organização (só para Admins Globais) */}
      {userData.admin === true && userData.tipo !== 'organizador' && (
        <Select 
          label="Selecione a Organização para Editar" 
          value={selectedOrgId} 
          onChange={e => setSelectedOrgId(e.target.value)}
        >
          {orgsList.map(org => (
            <option key={org.id} value={org.id}>{org.nome}</option>
          ))}
        </Select>
      )}

      {/* Prévia da Imagem de Capa */}
      {formData.imagemUrl && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Prévia da Capa</label>
          <img src={formData.imagemUrl} alt="Capa" className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}

      {/* Inputs do Formulário */}
      <Input label="Nome da Organização" type="text" name="nome" value={formData.nome} onChange={handleFormChange} required />
      <Input label="Descrição (Perfil)" type="text" name="descricao" value={formData.descricao} onChange={handleFormChange} />
      <Input label="Link da Imagem de Capa" type="text" name="imagemUrl" value={formData.imagemUrl} onChange={handleFormChange} placeholder="https://imgur.com/link.png" />
      <Input label="XP Base Padrão" type="number" name="xpBase" value={formData.xpBase} onChange={handleFormChange} min="0" />
      
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Button primary type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
}
// (Formulário CreateDonationForm sem mudanças)
function CreateDonationForm() {
  const { user } = useAuth();
  const [patrocinador, setPatrocinador] = useState('');
  const [valorTotal, setValorTotal] = useState(500);
  const [atividade, setAtividade] = useState('');
  const [xpOferecido, setXpOferecido] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateDonation = async (e) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('http://localhost:3001/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patrocinador, valorTotal: Number(valorTotal), atividade, xpOferecido: Number(xpOferecido) })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar');
      setMessage(`Patrocínio de "${patrocinador}" registrado com sucesso!`);
      setPatrocinador(''); setValorTotal(500); setAtividade(''); setXpOferecido(0);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleCreateDonation} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Novo Patrocínio (Donation)</h2>
      <Input label="Nome do Patrocinador" type="text" value={patrocinador} onChange={e => setPatrocinador(e.target.value)} required />
      <Input label="Atividade / Causa" type="text" value={atividade} onChange={e => setAtividade(e.target.value)} placeholder="Ex: Patrocínio do Major de SP" required />
      <Input label="Valor Total (R$)" type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} min="0" required />
      <Input label="XP Bônus Oferecido" type="number" value={xpOferecido} onChange={e => setXpOferecido(e.target.value)} min="0" />
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Button primary type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar Patrocínio'}</Button>
    </form>
  );
}

// --- FORMULÁRIO DE RESULTADOS (MODIFICADO) ---
function FinalizeChampionshipForm() {
  const { user } = useAuth();
  const [championships, setChampionships] = useState([]); // Agora são SÓ os campeonatos do admin
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedChamp, setSelectedChamp] = useState('');
  const [top8Players, setTop8Players] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', });
  const [participationPlayers, setParticipationPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        // --- MUDANÇA AQUI ---
        // 1. Busca SÓ os campeonatos do admin
        const champsRes = await fetch('http://localhost:3001/api/admin/my-championships', { headers });
        const champsData = await champsRes.json();
        if (champsRes.ok) {
          setChampionships(champsData);
          if (champsData.length > 0) setSelectedChamp(champsData[0].id);
        } else {
          throw new Error(champsData.error || 'Erro ao buscar seus campeonatos');
        }

        // 2. Busca todos os jogadores (sem mudança)
        const playersRes = await fetch('http://localhost:3001/api/players', { headers });
        const playersData = await playersRes.json();
        if (playersRes.ok) {
          setAllPlayers(playersData);
        } else {
          throw new Error(playersData.error || 'Erro ao buscar jogadores');
        }
      } catch (err) {
        setMessage(`Erro ao carregar dados: ${err.message}`);
      }
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const handleTop8Change = (position, playerId) => {
    setTop8Players(prev => ({ ...prev, [position]: playerId, }));
  };
  const handleParticipationSelect = (player) => {
    setParticipationPlayers(prev => [...prev, player]);
  };
  const handleParticipationDeselect = (player) => {
    setParticipationPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChamp) {
      setMessage('Erro: Selecione um campeonato.');
      return;
    }
    setLoading(true);
    setMessage('');

    const top8Data = Object.entries(top8Players)
      .filter(([pos, id]) => id)
      .map(([pos, id]) => ({ jogadorId: id, posicao: parseInt(pos, 10) }));
    const participationData = participationPlayers.map(p => p.id);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:3001/api/admin/championships/${selectedChamp}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ top8: top8Data, participation: participationData })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar resultado');
      setMessage(resData.message);
      setTop8Players({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
      setParticipationPlayers([]);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  if (loadingData) {
    return <LoadingSpinner text="Carregando campeonatos e jogadores..." />
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Lançar Resultados do Campeonato</h2>

      {/* O Select agora só mostra os camps daquele admin */}
      <Select label="Selecione o Campeonato da sua Organização" value={selectedChamp} onChange={e => setSelectedChamp(e.target.value)} required>
        {championships.length === 0 ? (
          <option>Nenhum campeonato criado pela sua organização</option>
        ) : (
          championships.map(champ => (
            <option key={champ.id} value={champ.id}>{champ.nome} (XP Base: {champ.xpTotal})</option>
          ))
        )}
      </Select>

      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Vencedores (Top 8)</h3>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(pos => (
          <Select key={pos} label={`${pos}º Lugar`} value={top8Players[pos]} onChange={e => handleTop8Change(pos, e.target.value)}>
            <option value="">-- Selecione um Jogador --</option>
            {allPlayers.map(player => (
              <option key={player.id} value={player.id}>{player.nome}</option>
            ))}
          </Select>
        ))}
      </div>

      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Participação (9º+)</h3>
      <p className="text-sm text-gray-400 mb-4">Adicione todos os outros jogadores que participaram e ganharão 10% do XP Base.</p>

      <PlayerMultiSelect
        label="Adicionar Jogadores (9º+)"
        players={allPlayers}
        selectedPlayers={participationPlayers}
        onSelect={handleParticipationSelect}
        onDeselect={handleParticipationDeselect}
      />

      {message && (
        <p className={`text-center my-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}

      <Button primary type="submit" disabled={loading || allPlayers.length === 0 || championships.length === 0}>
        {loading ? 'Finalizando...' : 'Finalizar e Distribuir XP'}
      </Button>
    </form>
  );
}

// --- FORMULÁRIO DE RESULTADOS CUSTOMIZADO ---
function FinalizeChampionshipFormCustom() {
  const { user, userData } = useAuth();
  const [championships, setChampionships] = useState([]); 
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedChamp, setSelectedChamp] = useState('');
  
  // Estado para os 8 inputs de XP (player ID e XP)
  const [top8Data, setTop8Data] = useState({
    1: { id: '', xp: '' }, 2: { id: '', xp: '' }, 3: { id: '', xp: '' }, 4: { id: '', xp: '' },
    5: { id: '', xp: '' }, 6: { id: '', xp: '' }, 7: { id: '', xp: '' }, 8: { id: '', xp: '' },
  });
  
  const [participationPlayers, setParticipationPlayers] = useState([]); 
  const [participationXp, setParticipationXp] = useState(10); // XP Padrão 9+
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  // Efeito para buscar dados (campeonatos e jogadores)
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userData) return;
      setLoadingData(true);
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Busca campeonatos (agora usa a rota corrigida que funciona para Admin e Org)
        const champsRes = await fetch('http://localhost:3001/api/admin/my-championships', { headers });
        const champsData = await champsRes.json();
        if (champsRes.ok) {
          setChampionships(champsData);
          if (champsData.length > 0) setSelectedChamp(champsData[0].id); 
        } else { throw new Error(champsData.error || 'Erro ao buscar seus campeonatos'); }
        
        // 2. Busca jogadores
        const playersRes = await fetch('http://localhost:3001/api/players', { headers });
        const playersData = await playersRes.json();
        if (playersRes.ok) { setAllPlayers(playersData); } 
        else { throw new Error(playersData.error || 'Erro ao buscar jogadores'); }
        
      } catch (err) { setMessage(`Erro ao carregar dados: ${err.message}`); }
      setLoadingData(false);
    };
    fetchData();
  }, [user, userData]); // Roda quando o usuário carrega

  // Handlers para os inputs customizados
  const handleTop8PlayerChange = (pos, playerId) => {
    setTop8Data(prev => ({ ...prev, [pos]: { ...prev[pos], id: playerId } }));
  };
  const handleTop8XpChange = (pos, xp) => {
    setTop8Data(prev => ({ ...prev, [pos]: { ...prev[pos], xp: xp } })); // Manter como string temporariamente
  };
  
  const handleParticipationSelect = (player) => {
    setParticipationPlayers(prev => [...prev, player]);
  };
  const handleParticipationDeselect = (player) => {
    setParticipationPlayers(prev => prev.filter(p => p.id !== player.id));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChamp) { setMessage('Erro: Selecione um campeonato.'); return; }
    setLoading(true); setMessage('');
    
    // Formata os dados para o backend
    const top8DataFormatted = Object.entries(top8Data)
      .filter(([pos, data]) => data.id && Number(data.xp) > 0) // Filtra quem tem ID e XP
      .map(([pos, data]) => ({ 
        jogadorId: data.id, 
        posicao: parseInt(pos, 10),
        xpGanho: Number(data.xp) // Converte XP para número
      }));
      
    const participationDataFormatted = {
      jogadorIds: participationPlayers.map(p => p.id),
      xpGanho: Number(participationXp)
    };
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:3001/api/admin/championships/${selectedChamp}/finalize-custom`, { // <-- NOVA ROTA
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ top8: top8DataFormatted, participation: participationDataFormatted })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar resultado');
      setMessage(resData.message); 
      // Limpa o formulário
      setTop8Data({ 1: { id: '', xp: '' }, 2: { id: '', xp: '' }, 3: { id: '', xp: '' }, 4: { id: '', xp: '' }, 5: { id: '', xp: '' }, 6: { id: '', xp: '' }, 7: { id: '', xp: '' }, 8: { id: '', xp: '' } });
      setParticipationPlayers([]);
      setParticipationXp(10);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  
  if (loadingData) {
    return <LoadingSpinner text="Carregando campeonatos e jogadores..." />
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-700 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Lançamento Customizado (XP Manual)</h2>
      
      <Select 
        label="Selecione o Campeonato" 
        value={selectedChamp} 
        onChange={e => setSelectedChamp(e.target.value)} 
        required
      >
        {championships.length === 0 ? (
          <option>Nenhum campeonato encontrado</option>
        ) : (
          // O Admin Global verá o nome da Org entre parênteses
          championships.map(champ => (
            <option key={champ.id} value={champ.id}>
              {champ.nome} {userData.tipo === 'admin' ? `(${champ.organizadorNome})` : ''}
            </option>
          ))
        )}
      </Select>
      
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Vencedores (Top 8)</h3>
      
      {[1, 2, 3, 4, 5, 6, 7, 8].map(pos => (
        // Um grupo de (Posição + Seletor de Jogador + Input de XP)
        <div key={pos} className="grid grid-cols-6 gap-2 items-end mb-2">
          <span className="col-span-1 text-gray-300 font-bold self-center mb-4">{pos}º:</span>
          <div className="col-span-3">
            <Select 
              label={pos === 1 ? "Jogador" : ""} // Label só no primeiro
              value={top8Data[pos].id} 
              onChange={e => handleTop8PlayerChange(pos, e.target.value)} 
            >
              <option value="">-- Selecione Jogador --</option>
              {allPlayers.map(player => ( <option key={player.id} value={player.id}>{player.nome}</option> ))}
            </Select>
          </div>
          <div className="col-span-2">
             <Input 
               label={pos === 1 ? "XP Manual" : ""} // Label só no primeiro
               type="number" 
               value={top8Data[pos].xp} 
               onChange={e => handleTop8XpChange(pos, e.target.value)} 
               placeholder="XP" 
               min="0"
             />
          </div>
        </div>
      ))}
      
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Participação (9º+)</h3>
      
      <Input 
        label="XP Manual para TODOS 9º+" 
        type="number" 
        value={participationXp} 
        onChange={e => setParticipationXp(e.target.value)} 
        min="0" 
      />
      
      <PlayerMultiSelect
        label="Adicionar Jogadores (9º+)"
        players={allPlayers}
        selectedPlayers={participationPlayers}
        onSelect={handleParticipationSelect}
        onDeselect={handleParticipationDeselect}
      />
      
      {message && (
        <p className={`text-center my-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      
      <Button primary type="submit" disabled={loading || allPlayers.length === 0 || championships.length === 0}>
        {loading ? 'Finalizando...' : 'Finalizar Lançamento Customizado'}
      </Button>
    </form>
  );
}