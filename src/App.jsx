import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword
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

// O Vite (Vercel) usará a VITE_API_URL.
// Localmente (seu PC), ele usará o 'http://localhost:3001'.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// MAPA DE JOGOS
const GAME_MAP = {
  'sf6': {
    name: 'Street Fighter 6',
    icon: '/assets/icones-jogos/sf6.jpeg' 
  },
  'mk1': {
    name: 'Mortal Kombat 1',
    icon: '/assets/icones-jogos/mk1.png'
  },
  'tekken8': {
    name: 'Tekken 8',
    icon: '/assets/icones-jogos/tekken8.jpeg'
  },
  'ggst': {
    name: 'Guilty Gear -Strive-',
    icon: '/assets/icones-jogos/ggst.jpeg'
  },
  '2xko': {
    name: '2xko',
    icon: '/assets/icones-jogos/2sko.jpeg'
  },
  'ff': {
    name: 'Final Fight City - Of The Wolves',
    icon: '/assets/icones-jogos/ff.jpeg'
  },
  'kof15': {
    name: 'The King Of Fighters 15',
    icon: '/assets/icones-jogos/kof15.jpeg'
  },
};

// Content da rifa
const STATIC_RIFA_DATA = {
  titulo: "Rifa Especial da Comunidade",
  descricao: "Concorra a um Controle Arcade exclusivo! Cada cota ajuda a financiar o próximo torneio.",
  imagemUrl: "./public/assets/rifa/novembro-arcade.jpg",
  qrCodeUrl: "./public/assets/rifa/novembro-qrCode.png",
  pagamentoDesc: "Valor: R$ 5,00 por cota.\nChave PIX (Email): fgcbrasil@pix.com\n\nEnvie o comprovante para o Admin."
};

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
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // (Logs de debug removidos)
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, 
          (doc) => {
            // (Logs de debug removidos)
            if (doc.exists()) {
              setUserData(doc.data());
            } else {
              setUserData(null); 
            }
            setLoading(false);
          }, 
          (error) => {
            console.error("onSnapshot Erro:", error); // MANTEMOS este log de ERRO
            setUserData(null);
            setLoading(false); 
          }
        );
        return () => unsubscribeDoc();
      } else {
        // (Logs de debug removidos)
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe(); 
    };
  }, []); // Dependência vazia

  const value = { user, userData, loading };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- COMPONENTE PRINCIPAL (O ROTEADOR) ---
function AppContent() {
  const [page, setPage] = useState('home'); 
  const { user, userData, loading } = useAuth(); 

  if (loading) {
    return <LoadingSpinner text="Carregando Autenticação..." />
  }
  
  const renderPage = () => {
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
          
        // --- MUDANÇA AQUI ---
        case 'profile':
          // Agora, Jogadores, Fãs E Organizadores podem editar o perfil
          if (userData.tipo === 'jogador' || userData.tipo === 'fã' || userData.tipo === 'organizador') {
            return <ProfilePage setPage={setPage} />;
          }
          return <DashboardPage setPage={setPage} />;
        // --- FIM DA MUDANÇA ---
        
        case 'admin':
          if (userData.admin === true && userData.tipo === 'admin') { 
            return <AdminPage setPage={setPage} />;
          }
          return <DashboardPage setPage={setPage} />; 
        
        default:
          return <DashboardPage setPage={setPage} />; 
      }
    } else if (user && !userData) {
       return <LoadingSpinner text="Finalizando registro..." />
    } else {
      return <LoginPage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light font-sans relative">
      <BottomSponsorBanner />
      <Navbar setPage={setPage} />
      <main className="container mx-auto p-4 md:p-8 px-28 lg:px-48">
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    setIsMobileMenuOpen(false); 
    setPage('login');
  };
  
  const handleNavClick = (page) => {
    setPage(page);
    setIsMobileMenuOpen(false);
  };

  const renderNavLinks = (isMobile = false) => {
    const LinkComponent = isMobile ? MobileNavLink : NavLink;
    const clickHandler = (page) => isMobile ? () => handleNavClick(page) : () => setPage(page);

    if (!user || !userData) {
      return (
        <Button primary onClick={() => clickHandler('login')}>
          Login / Registro
        </Button>
      );
    }
    
    // --- MUDANÇA AQUI ---
    // 'organizador' agora está incluído no hasProfilePage
    const hasProfilePage = userData.tipo === 'jogador' || userData.tipo === 'fã' || userData.tipo === 'organizador';
    // --- FIM DA MUDANÇA ---
    
    const profileImage = userData.profileImageUrl || 'https://placehold.co/40x40/6f42c1/ffffff?text=U';

    if (userData.admin === true && userData.tipo === 'admin') {
      return (
        <>
          <LinkComponent onClick={clickHandler('dashboard')}>Dashboard</LinkComponent>
          <LinkComponent onClick={clickHandler('championships')}>Organizações</LinkComponent>
          <LinkComponent onClick={clickHandler('ranking')}>Ranking</LinkComponent>
          <LinkComponent onClick={clickHandler('rifa')}>Rifa</LinkComponent>
          <LinkComponent onClick={clickHandler('admin')}>
            <span className={!isMobile ? "text-teal-300 font-bold" : ""}>Admin</span>
          </LinkComponent>
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }
    
    // Se for Jogador OU Organizador
    if (userData.tipo === 'jogador' || userData.tipo === 'organizador') {
       return (
        <>
          <LinkComponent onClick={clickHandler('dashboard')}>Dashboard</LinkComponent>
          <LinkComponent onClick={clickHandler('championships')}>Organizações</LinkComponent>
          <LinkComponent onClick={clickHandler('ranking')}>Ranking</LinkComponent>
          <LinkComponent onClick={clickHandler('rifa')}>Rifa</LinkComponent>
          
          {/* --- MUDANÇA AQUI ---
            Agora, tanto Jogador quanto Organizador verão a imagem
            pois hasProfilePage é true para ambos.
          --- FIM DA MUDANÇA --- */}
          {hasProfilePage && (
             <img 
               src={profileImage} 
               alt="Perfil" 
               className="w-10 h-10 rounded-full cursor-pointer object-cover" 
               onClick={clickHandler('profile')}
             />
          )}
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }
    
    // Se for Fã
    if (userData.tipo === 'fã') {
       return (
        <>
          <LinkComponent onClick={clickHandler('dashboard')}>Dashboard</LinkComponent>
          <LinkComponent onClick={clickHandler('championships')}>Organizações</LinkComponent>
          <LinkComponent onClick={clickHandler('streamers')}>Streamers</LinkComponent>
          <LinkComponent onClick={clickHandler('missões')}>Missões</LinkComponent>
          <LinkComponent onClick={clickHandler('ranking')}>Ranking</LinkComponent>
          <LinkComponent onClick={clickHandler('rifa')}>Rifa</LinkComponent>
          <img 
            src={profileImage} 
            alt="Perfil" 
            className="w-10 h-10 rounded-full cursor-pointer object-cover" 
            onClick={clickHandler('profile')}
          />
          <Button onClick={handleLogout}>Sair</Button>
        </>
      );
    }
    
    return <Button onClick={handleLogout}>Sair</Button>;
  };

  return (
    // ... (o resto do Navbar continua o mesmo) ...
    <nav className="bg-gray-800 shadow-lg sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div 
            className="text-2xl font-bold text-white cursor-pointer"
            onClick={() => handleNavClick(user ? 'dashboard' : 'home')}
          >
            <span className="text-purple-400">FGC</span>Brasil
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            {renderNavLinks(false)}
          </div>
          
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-md"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              )}
            </button>
          </div>
          
        </div>
      </div>
      
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:hidden absolute top-full left-0 w-full bg-gray-800 shadow-lg z-50`}>
        <div className="p-4 space-y-2">
          {renderNavLinks(true)}
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

const MobileNavLink = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="block w-full text-left px-4 py-3 text-lg text-gray-300 hover:bg-gray-700 hover:text-white"
  >
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
function BottomSponsorBanner() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-6 py-4">
      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador1.jpg"
          alt="Patrocinador 3"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg transition-transform hover:scale-105" 
        />
      </a>

      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador1.jpg" 
          alt="Patrocinador 4"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg transition-transform hover:scale-105" 
        />
      </a>

      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador1.jpg" 
          alt="Patrocinador 5"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg transition-transform hover:scale-105" 
        />
      </a>
      <a href="#" target="_blank" rel="noopener noreferrer">
        <img 
          src="/assets/patrocinador1.jpg" 
          alt="Patrocinador 5"
          className="w-24 lg:w-40 h-auto object-contain rounded-lg shadow-lg transition-transform hover:scale-105" 
        />
      </a>
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
  const [tipo, setTipo] = useState('jogador'); 
  const [error, setError] = useState('');
  
  // --- NOVOS ESTADOS PARA O REGISTRO ---
  const [teamName, setTeamName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false); // Loading geral
  // --- FIM DOS NOVOS ESTADOS ---
  
  // Credenciais do Cloudinary (necessárias para o upload)
  const CLOUDINARY_CLOUD_NAME = "dy0hmkgry"; 
  const CLOUDINARY_UPLOAD_PRESET = "br5z3gyj";

  // Gera a prévia da imagem
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      // --- Login ---
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setPage('dashboard'); 
      } catch (err) {
        setError(getFriendlyAuthError(err.code));
      }
      setLoading(false); // Para o loading do login
    } else {
      // --- Registro (LÓGICA ATUALIZADA) ---
      if (!nome) {
        setError("Por favor, informe seu nome ou nick.");
        setLoading(false);
        return;
      }
      
      let profileImageUrl = '';
      
      try {
        // 1. Se um arquivo foi selecionado, faça o upload PRIMEIRO
        if (file) {
          if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            throw new Error("Cloudinary não está configurado no frontend.");
          }
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error.message || 'Falha no upload do Cloudinary');
          profileImageUrl = data.secure_url; // Pega a nova URL
        }

        // 2. Crie o usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 3. Atualize o displayName (nome) e photoURL no Auth
        await updateProfile(user, { 
          displayName: nome,
          photoURL: profileImageUrl 
        });

        // 4. Envie TUDO para o seu backend para criar o documento no Firestore
        await fetch(`${API_BASE_URL}/api/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid, 
            email: user.email, 
            nome: nome, 
            tipo: tipo,
            profileImageUrl: profileImageUrl, // Envia a URL
            teamName: tipo === 'jogador' ? teamName : '' // Envia o time (se for jogador)
          })
        });
        
        setPage('dashboard'); 
      } catch (err) {
        setError(getFriendlyAuthError(err.code) || err.message);
      }
      setLoading(false); // Para o loading do registro
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
            {/* --- NOVO: Input de Foto --- */}
            <div className="flex flex-col items-center mb-4">
              <img 
                src={preview || 'https://placehold.co/100x100/1a202c/6f42c1?text=Foto'} 
                alt="Prévia" 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
              />
              <Input 
                label="Foto de Perfil (Opcional)"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>
            {/* --- FIM --- */}
          
            <Input label="Nome / Nick" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Eu sou:</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="jogador">Jogador</option>
                <option value="fã">Fã / Espectador</option>
                <option value="organizador">Organizador</option> 
              </select>
            </div>
            
            {/* --- NOVO: Input de Time (Condicional) --- */}
            {tipo === 'jogador' && (
              <Input 
                label="Nome da Equipe (Opcional)" 
                type="text" 
                value={teamName} 
                onChange={e => setTeamName(e.target.value)} 
                placeholder="Ex: LOUD, Furia"
              />
            )}
            {/* --- FIM --- */}
          </>
        )}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 shadow-lg disabled:opacity-50">
          {loading ? 'Processando...' : (isLogin ? 'Login' : 'Registrar')}
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
      const res = await fetch(`${API_BASE_URL}/api/rifa/add-participante`, {
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
  
  // O estado 'rifa' agora começa com os dados estáticos
  const [rifa, setRifa] = useState(STATIC_RIFA_DATA); 
  
  // Novo estado apenas para os participantes
  const [participantes, setParticipantes] = useState([]);
  
  const [allUsers, setAllUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = userData?.admin === true && userData?.tipo === 'admin';

  // Função para buscar APENAS os participantes da rifa
  const fetchRifaParticipantes = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/rifa/atual`);
      const data = await res.json();
      if (res.ok) {
        if (data.participantes) {
          data.participantes.sort((a, b) => a.numero - b.numero);
          setParticipantes(data.participantes);
        } else {
          setParticipantes([]);
        }
      } else {
        // Se o doc 'atual' não existir no Firestore, não é um erro fatal.
        // Apenas significa que não há participantes.
        console.warn(data.error || 'Documento da rifa "atual" não encontrado. Criando um novo automaticamente na próxima adição de cota.');
        setParticipantes([]);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Busca os dados (participantes e lista de usuários)
  useEffect(() => {
    fetchRifaParticipantes(); // Busca participantes
    
    if (isAdmin) {
      const fetchAllUsers = async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_BASE_URL}/api/users/all`, {
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

  // Handler para o botão de reset (continua igual)
  const handleResetRifa = async () => {
    if (!window.confirm("Você tem CERTEZA que quer apagar TODAS as cotas desta rifa? Esta ação é irreversível.")) {
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/rifa/reset`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar');
      alert(data.message);
      fetchRifaParticipantes(); // Recarrega os participantes
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  // O loading agora é só para o fetch de participantes
  if (loading && isAdmin) return <LoadingSpinner text="Carregando Rifa..." />;
  
  // (Removemos o 'error || !rifa' porque a rifa agora é estática)
  
  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8 text-center">{rifa.titulo}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda: Detalhes e Pagamento (usando 'rifa' estática) */}
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
              onParticipanteAdded={fetchRifaParticipantes} // Atualiza a lista
              allUsers={allUsers} 
            />
          )}
          
          {/* Lista de Cotas (usando 'participantes' do estado) */}
          <div className="max-h-96 lg:max-h-[600px] overflow-y-auto mt-4 border border-gray-700 rounded-lg flex-grow">
            {participantes.length === 0 && (
              <p className="text-gray-400 p-4 text-center italic">Nenhuma cota comprada ainda. Seja o primeiro!</p>
            )}
            <ul className="divide-y divide-gray-700">
              {participantes.map(p => (
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
      const res = await fetch(`${API_BASE_URL}/api/missions/complete`, {
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
      const res = await fetch(`${API_BASE_URL}/api/missions`);
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
  
  // --- NOVO ESTADO: Para o total de contribuições ---
  const [totalContributions, setTotalContributions] = useState(0);
  const [loadingTotal, setLoadingTotal] = useState(true);

  // --- NOVO EFEITO: Busca o total de contribuições ---
  useEffect(() => {
    const fetchTotalContributions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/contributions/total`);
        const data = await res.json();
        if (res.ok) {
          setTotalContributions(data.total);
        }
      } catch (err) {
        console.error("Erro ao buscar total de contribuições:", err);
      }
      setLoadingTotal(false);
    };
    fetchTotalContributions();
  }, []); // Roda uma vez no carregamento

  if (!userData) return <LoadingSpinner />;

  // Função para renderizar o dashboard específico do usuário
  const renderUserDashboard = () => {
    // ... (o switch case continua o mesmo) ...
    switch (userData.tipo) {
      case 'jogador':
        return <PlayerDashboard />;
      case 'fã':
        return <FanDashboard />;
      case 'organizador':
        return (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-center">
            <h3 className="text-2xl font-semibold mb-4">Dashboard de Organizador</h3>
            <p className="text-gray-400 mb-6">
              Bem-vindo! Você pode ver os rankings e as organizações.
            </p>
          </div>
        );
      case 'admin':
         return (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center text-center">
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
      
      {/* --- SEÇÃO STATS MODIFICADA (grid-cols-4) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Seu XP Total" value={userData.xpTotal.toFixed(2)} />
        <StatCard title="Ranking (Global)" value="#N/A" subtitle="Em breve" />
        
        {/* Card de Contribuições Pessoais (depende do tipo de usuário) */}
        {userData.tipo === 'fã' ? (
          <StatCard 
            title="Minhas Doações" 
            value={userData.contribuicoes ? userData.contribuicoes.length : 0} 
            className="text-center"
          />
        ) : (
          <StatCard 
            title="Camps. Participados" 
            value={userData.campeonatosParticipados.length} 
            className="text-center"
          />
        )}
        
        {/* --- NOVO CARD: Total de Contribuições --- */}
        <StatCard 
          title="Total Arrecadado (Fãs)" 
          value={loadingTotal ? "..." : `R$ ${totalContributions.toFixed(2)}`}
          subtitle="Apoio de toda a comunidade"
          className="text-center"
        />
      </div>
      {/* --- FIM DA SEÇÃO STATS --- */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda (maior) */}
        <div className="lg:col-span-2">
          {renderUserDashboard()}
        </div>
        
        {/* Coluna Direita (menor) */}
        <div className="lg:col-span-1 space-y-6"> 
          <CostsCard onOpenModal={() => setShowCostsModal(true)} />
          <ContactAdminCard /> 
        </div>
        
      </div>

      {/* O Modal (renderização condicional) */}
      {showCostsModal && <CostsModal onClose={() => setShowCostsModal(false)} />}
    </div>
  );
}

// --- PÁGINA PROFILE ---
// --- (SUBSTITUA A FUNÇÃO ProfilePage E ADICIONE SEUS FILHOS) ---

// NOVO Componente Filho (Formulário de Senha)
function PasswordUpdateForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (newPassword !== confirmPassword) {
      setMessage('Erro: As senhas não conferem.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Erro: A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      
      setMessage('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err) {
      // Erro comum se o login não for recente
      if (err.code === 'auth/requires-recent-login') {
        setMessage('Erro: Esta operação é sensível. Por favor, faça login novamente e tente de novo.');
      } else {
        setMessage(`Erro: ${err.message}`);
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handlePasswordUpdate} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Alterar Senha</h2>
      {message && (
        <p className={`text-center mb-4 text-sm ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Input 
        label="Nova Senha" 
        type="password" 
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        required
      />
      <Input 
        label="Repetir Nova Senha" 
        type="password" 
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        required
      />
      <Button primary type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Nova Senha'}
      </Button>
    </form>
  );
}

// Componente Filho Atualizado (Formulário de Perfil)
function ProfileUpdateForm() {
  const { user, userData } = useAuth();
  
  const CLOUDINARY_CLOUD_NAME = "dy0hmkgry"; 
  const CLOUDINARY_UPLOAD_PRESET = "br5z3gyj";
  
  // --- ESTADOS ATUALIZADOS ---
  const [nome, setNome] = useState(userData.nome || ''); // Adicionado Nome
  const [teamName, setTeamName] = useState(userData.teamName || '');
  const [file, setFile] = useState(null); 
  const [preview, setPreview] = useState(userData.profileImageUrl); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // --- FIM ---
  
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!nome) {
      setMessage('Erro: O nome não pode ficar em branco.');
      setLoading(false);
      return;
    }

    try {
      let imageUrl = preview; // Começa com a imagem atual (que pode ser a antiga ou a prévia)

      // 1. Se um NOVO arquivo foi selecionado, faça o upload para o Cloudinary
      if (file) {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          throw new Error("Cloudinary não está configurado no frontend.");
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message || 'Falha no upload do Cloudinary');
        imageUrl = data.secure_url; 
      }

      // 2. Envie os dados (incluindo o nome) para o SEU backend
      const token = await user.getIdToken();
      const resBackend = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profileImageUrl: imageUrl,
          teamName: teamName,
          nome: nome // <-- CAMPO ADICIONADO
        })
      });

      const dataBackend = await resBackend.json();
      if (!resBackend.ok) throw new Error(dataBackend.error || 'Falha ao salvar no backend');
      
      // 3. Atualiza o displayName no Auth do CLIENTE (para o Navbar)
      await updateProfile(user, {
        displayName: nome,
        photoURL: imageUrl
      });
      
      setMessage(dataBackend.message);
      setFile(null); 
      
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Editar Perfil</h2>
      
      <div className="flex flex-col items-center mb-6">
        <img 
          src={preview || 'https://placehold.co/150x150/1a202c/6f42c1?text=Foto'} 
          alt="Prévia do Perfil" 
          className="w-40 h-40 rounded-full object-cover border-4 border-gray-700"
        />
        <Input 
          label="Mudar foto de perfil"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
        />
      </div>

      {/* --- INPUT DE NOME ADICIONADO --- */}
      <Input 
        label="Nome / Nick"
        type="text"
        value={nome}
        onChange={e => setNome(e.target.value)}
        required
      />

      {/* Input condicional para Jogadores */}
      {userData.tipo === 'jogador' && (
        <Input 
          label="Nome da Equipe (Opcional)" 
          type="text" 
          value={teamName} 
          onChange={e => setTeamName(e.target.value)} 
          placeholder="Ex: LOUD, Furia"
        />
      )}
      
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      
      <Button primary type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Alterações de Perfil'}
      </Button>
    </form>
  );
}

// Página Principal (Agora é um container para os dois formulários)
function ProfilePage() {
  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Meu Perfil</h1>
      
      {/* Container com espaçamento */}
      <div className="space-y-8">
        <ProfileUpdateForm />
        <PasswordUpdateForm />
      </div>
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
      const res = await fetch(`${API_BASE_URL}/api/support/send-ticket`, {
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
  
  // A função handleContribute (que você usava) não é mais necessária por enquanto,
  // mas a deixamos aqui (ou a comentamos) para uso futuro.
  /*
  const handleContribute = async () => {
    setLoading(true); setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/contributions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
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
  */

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold mb-4 text-center">Apoie a Cena!</h3>
      
      {/* --- MODO 1: QR CODE ESTÁTICO (ATIVO AGORA) --- */}
      <p className="text-gray-400 mb-6 text-center">
        Contribua para a plataforma via PIX e ajude a manter a comunidade crescendo!
      </p>
      <div className="flex flex-col items-center gap-4">
        <img 
          src="https://placehold.co/200x200/ffffff/000000?text=QR+Code+PIX" 
          alt="QR Code PIX" 
          className="w-48 h-48 rounded-lg"
          // Substitua o 'src' acima pelo link real do seu QR Code
        />
        <p className="text-gray-300 text-sm text-center">
          Escaneie o QR Code para fazer sua doação. Qualquer valor ajuda a manter a plataforma no ar!
        </p>
      </div>

      {/* ---
      MODO 2: FORMULÁRIO DINÂMICO (PARA O FUTURO)
      (Seu código original está aqui, comentado)
      ---
      
      <p className="text-gray-400 mb-6 text-center">Faça uma doação e ganhe XP de Fã. (R$ 1 = 10 XP)</p>
      {message && <p className="text-center text-teal-300 mb-4">{message}</p>}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <Input label="Valor (R$)" type="number" value={valor} onChange={e => setValor(e.target.value)} min="5" />
        <Button primary onClick={handleContribute} disabled={loading}>
          {loading ? 'Processando...' : `Contribuir R$ ${valor}`}
        </Button>
      </div>
      
      */}
      
    </div>
  );
}

// --- PÁGINA RANKING (Sem mudanças) ---
function RankingPage({ setPage }) {
  const [playerRanking, setPlayerRanking] = useState([]); 
  const [fanRanking, setFanRanking] = useState([]);     
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- NOVOS ESTADOS ---
  const [config, setConfig] = useState({ minXpJogadores: 500, minXpFas: 100 });
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false);
  const [isFansExpanded, setIsFansExpanded] = useState(false);
  // --- FIM DOS NOVOS ESTADOS ---

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); 
      setError('');
      try {
        // --- MUDANÇA: Busca os rankings E a configuração ---
        const rankingRes = await fetch(`${API_BASE_URL}/api/ranking`);
        const configRes = await fetch(`${API_BASE_URL}/api/config/ranking`);
        
        const rankingData = await rankingRes.json();
        const configData = await configRes.json();

        if (rankingRes.ok) {
          setPlayerRanking(rankingData.players); 
          setFanRanking(rankingData.fans);       
        } else {
          throw new Error(rankingData.error || 'Erro ao buscar ranking');
        }
        
        if (configRes.ok) {
          setConfig(configData);
        } else {
          throw new Error(configData.error || 'Erro ao buscar config');
        }
        
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner text="Carregando Rankings..." />;
  
  if (error) {
    // ... (bloco de erro continua o mesmo) ...
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

  // --- COMPONENTE HELPER DE MARCADOR ---
  const MarkerRow = ({ text }) => (
    <tr className="bg-gray-900">
      <td colSpan="3" className="py-2 px-4 text-center">
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
          {text}
        </span>
      </td>
    </tr>
  );

  // --- COMPONENTE HELPER DE TABELA (ATUALIZADO) ---
  const RankingTable = ({ data, title, minXp, isExpanded, onToggleExpand }) => {
    
    // 1. Fatiar a lista se não estiver expandida
    const visibleData = isExpanded ? data : data.slice(0, 10);
    
    // 2. Encontrar o índice do último jogador qualificado
    let lastQualifiedIndex = -1;
    data.forEach((player, index) => {
      if (player.xpTotal >= minXp) {
        lastQualifiedIndex = index;
      }
    });

    return (
      <div className="bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
        <h3 className="text-2xl font-semibold text-white p-4">{title}</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-4 text-lg font-semibold w-16">Pos.</th>
              <th className="p-4 text-lg font-semibold">Nome</th>
              <th className="p-4 text-lg font-semibold">XP Total</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan="3" className="p-4 text-center text-gray-400">Ninguém classificado ainda.</td></tr>
            )}
            
            {/* 3. Mapear os dados VISÍVEIS */}
            {visibleData.map((item, index) => {
              // Verifica se o loop 'map' (do visibleData) é o último qualificado
              const isLastQualified = (index === lastQualifiedIndex);
              
              return (
                // Usamos Fragment (<>) para agrupar a linha do jogador E os marcadores
                <React.Fragment key={item.jogadorId}>
                  <tr className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                    <td className="p-4 text-xl font-bold text-purple-400">{item.posicao}</td>
                    <td className="p-4 text-lg">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.profileImageUrl || 'https://placehold.co/40x40/1a202c/6f42c1?text=U'} 
                          alt={item.nome}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span>{item.nome}</span>
                      </div>
                    </td>
                    <td className="p-4 text-lg font-medium text-teal-300">{item.xpTotal.toFixed(2)}</td>
                  </tr>
                  
                  {/* --- LÓGICA DOS MARCADORES --- */}
                  {index === 2 && <MarkerRow text="Top 3" />}
                  {index === 9 && isExpanded && <MarkerRow text="Top 10" />}
                  {isLastQualified && <MarkerRow text={`Mínimo de ${minXp} XP`} />}
                  {/* --- FIM DA LÓGICA --- */}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        
        {/* 4. Botão de Expandir */}
        {data.length > 10 && (
          <div className="p-4 bg-gray-700 text-center">
            <Button onClick={onToggleExpand}>
              {isExpanded ? 'Mostrar menos' : `Mostrar todos (${data.length})`}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Renderiza a página
  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-8">Rankings da Comunidade</h1>
      
      <div className="space-y-8"> 
        <RankingTable 
          title="Ranking de Jogadores" 
          data={playerRanking} 
          minXp={config.minXpJogadores}
          isExpanded={isPlayersExpanded}
          onToggleExpand={() => setIsPlayersExpanded(!isPlayersExpanded)}
        />
        <RankingTable 
          title="Ranking de Fãs" 
          data={fanRanking}
          minXp={config.minXpFas}
          isExpanded={isFansExpanded}
          onToggleExpand={() => setIsFansExpanded(!isFansExpanded)}
        />
      </div>
    </div>
  );
}

// (Página de Organizações)
function ChampionshipsPage({ setPage }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null); 

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/organizacoes`);
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
      <h1 className="text-4xl font-bold mb-8">Organizações</h1>
      {orgs.length === 0 && <p className="text-gray-400 text-center">Nenhuma organização registrada ainda.</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgs.map((org) => (
          <div 
            key={org.id} 
            className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-purple-500/30 transition duration-300 flex flex-col" // <-- Adicionado flex flex-col
            onClick={() => setSelectedOrg(org)}
          >
            <img 
              src={org.imagemUrl || 'https://placehold.co/400x200/1a202c/6f42c1?text=Capa+da+Org'} 
              alt={org.nome}
              className="w-full h-32 object-cover rounded-lg mb-4"
            />
            <h3 className="text-2xl font-bold text-teal-300 mb-2 truncate">{org.nome}</h3>
            <p className="text-gray-300 mb-6 line-clamp-2 h-12">{org.descricao}</p>
            
            {/* --- BLOCO DE ÍCONES ADICIONADO --- */}
            <div className="mb-4 mt-auto pt-4 border-t border-gray-700"> {/* mt-auto empurra para baixo */}
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Jogos Principais:</h4>
              <div className="flex gap-2">
                {/* Se não houver jogos, mostre um placeholder */}
                {!org.games || org.games.length === 0 ? (
                  <span className="text-xs text-gray-500 italic">Nenhum campeonato registrado</span>
                ) : (
                  // Loop pelo array de slugs de jogos
                  org.games.map(gameSlug => (
                    <img
                      key={gameSlug}
                      src={GAME_MAP[gameSlug]?.icon || 'https://placehold.co/30x30/1a202c/fff?text=?'} // Usa o mapa
                      alt={GAME_MAP[gameSlug]?.name || 'Jogo'}
                      title={GAME_MAP[gameSlug]?.name || 'Jogo'}
                      className="w-8 h-8 rounded-full object-cover border-2 border-purple-500"
                    />
                  ))
                )}
              </div>
            </div>
            {/* --- FIM DO BLOCO DE ÍCONES --- */}
            
            <Button>Ver Campeonatos</Button>
          </div>
        ))}
      </div>
      
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
  
  // --- NOVO: Estado para o histórico ---
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Busca campeonatos da organização selecionada
    const fetchChamps = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/organizacoes/${org.id}/championships`);
        const data = await res.json();
        if (res.ok) {
          setChamps(data); // A rota já retorna ordenado por data
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
  
  // Separa o último campeonato do restante
  const latestChamp = champs.length > 0 ? champs[0] : null;
  const oldChamps = champs.length > 1 ? champs.slice(1) : [];

  return (
    // Fundo do Modal
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Fecha ao clicar fora
    >
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
            
            {latestChamp && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Último Evento</h3>
                <ChampResultCard champ={latestChamp} />
              </div>
            )}
            
            {oldChamps.length > 0 && (
              <div className="mt-4">
                <Button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full bg-gray-600 text-white hover:bg-gray-500"
                >
                  {showHistory ? 'Esconder Histórico' : `Ver Histórico (${oldChamps.length} eventos)`}
                </Button>                
                {showHistory && (
                  <div className="space-y-4 mt-4">
                    {oldChamps.map(champ => (
                      <ChampResultCard key={champ.id} champ={champ} />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// Este card é reutilizável para o "Último" e para o "Histórico"
function ChampResultCard({ champ }) {
  const participantesOrdenados = champ.participantes ? 
    champ.participantes.sort((a, b) => a.posicao - b.posicao) : 
    []; 

  // --- LÓGICA DE DATA CORRIGIDA ---
  // Tenta ler .seconds (para dados ao vivo do Firebase)
  // Se falhar, tenta ler o champ.data diretamente (para dados da API)
  const dataValida = champ.data?.seconds ? new Date(champ.data.seconds * 1000) : new Date(champ.data);
  const dataFormatada = !isNaN(dataValida) ? dataValida.toLocaleDateString('pt-BR') : "Data Inválida";
  // --- FIM DA CORREÇÃO ---

  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <h4 className="text-xl font-semibold text-white">{champ.nome}</h4>
      <p className="text-sm text-gray-400 mb-2">Data: {dataFormatada} | XP Base: {champ.xpTotal}</p>
      <p className="text-sm text-gray-300 mb-3">{champ.descricao}</p>
      
      <h5 className="text-md font-semibold text-purple-300 mb-2">Resultados</h5>
      <div className="text-sm max-h-40 overflow-y-auto">
        {participantesOrdenados.length === 0 && (
          <p className="text-gray-400 italic">Resultados ainda não lançados.</p>
        )}
        {participantesOrdenados.map((p, index) => (
          <div 
            key={`${p.jogadorId}-${p.posicao}-${index}`} 
            className="flex justify-between items-center p-1 border-b border-gray-600 last:border-b-0"
          >
            <span className="text-gray-300 w-10">
              {p.posicao <= 8 ? `${p.posicao}º` : '9º+'}
            </span>
            <span className="text-white truncate mx-2 flex-1">{p.nome}</span> 
            <span className="text-teal-300 w-24 text-right">+{p.xpGanho.toFixed(2)} XP</span>
          </div>
        ))}
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
        
        {activeTab === 'organizations' && (
          // --- MUDANÇA AQUI ---
          // Agora a aba tem 3 seções
          <div className="space-y-10">
            <ManageOrganizationsForm />
            <ManageRankingConfigCard /> {/* <-- CARD ADICIONADO */}
            <ResetRankingCard /> 
          </div>
        )}
        
        {activeTab === 'results' && (
          <div className="space-y-10">
            <FinalizeChampionshipForm />
            <hr className="border-gray-500 border-dashed" />
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
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); 
  const [xpTotal, setXpTotal] = useState(''); 
  const [xpBaseAutomatico, setXpBaseAutomatico] = useState(1000); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // --- NOVO ESTADO PARA O JOGO ---
  const [gameSlug, setGameSlug] = useState(Object.keys(GAME_MAP)[0]); // Seleciona o primeiro jogo da lista
  // --- FIM ---

  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [orgsList, setOrgsList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(''); 

  useEffect(() => {
    // ... (Este useEffect continua o MESMO) ...
    if (!userData) return;
    const fetchOrgsData = async () => {
      try {
        if (userData.admin === true && userData.tipo !== 'organizador') {
          setIsGlobalAdmin(true);
          const res = await fetch(`${API_BASE_URL}/api/organizacoes`);
          const data = await res.json();
          if (res.ok) {
            setOrgsList(data);
            if (data.length > 0) {
              setSelectedOrgId(data[0].id);
              setXpBaseAutomatico(data[0].xpBase || 1000); 
            }
          }
        } 
        else if (userData.tipo === 'organizador' && userData.organizacaoId) {
          const res = await fetch(`${API_BASE_URL}/api/organizacoes/${userData.organizacaoId}`);
          const data = await res.json();
          if (res.ok) {
            setXpBaseAutomatico(data.xpBase || 1000); 
          }
        }
      } catch (err) {
        setMessage(`Erro ao buscar dados da organização: ${err.message}`);
      }
    };
    fetchOrgsData();
  }, [userData]); 

  useEffect(() => {
    // ... (Este useEffect continua o MESMO) ...
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
        game: gameSlug, // <-- CAMPO ADICIONADO
        xpTotal: Number(xpTotal) > 0 ? Number(xpTotal) : null,
        organizadorId: isGlobalAdmin ? selectedOrgId : null 
      };
      
      const res = await fetch(`${API_BASE_URL}/api/championships`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(body)
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao criar campeonato');
      setMessage(`Campeonato "${nome}" criado com sucesso!`);
      
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

      {/* --- NOVO SELETOR DE JOGO --- */}
      <Select 
        label="Jogo Principal" 
        value={gameSlug} 
        onChange={e => setGameSlug(e.target.value)}
      >
        {Object.keys(GAME_MAP).map(slug => (
          <option key={slug} value={slug}>
            {GAME_MAP[slug].name}
          </option>
        ))}
      </Select>
      {/* --- FIM DO SELETOR --- */}
      
      <Input label="Nome do Campeonato" type="text" value={nome} onChange={e => setNome(e.target.value)} required />
      <Input label="Descrição" type="text" value={descricao} onChange={e => setDescricao(e.target.value)} />
      <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} required />
      
      <Input 
        label="XP Base (Opcional - Override)" 
        type="number" 
        value={xpTotal} 
        onChange={e => setXpTotal(e.target.value)} 
        min="0"
        placeholder={`Automático: ${xpBaseAutomatico} XP`} 
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
          const res = await fetch(`${API_BASE_URL}/api/organizacoes`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao buscar orgs');
          setOrgsList(data);
          if (data.length > 0) setSelectedOrgId(data[0].id); // Seleciona a primeira
        }
        // Se for Organizador, só pode editar a sua
        else if (userData.tipo === 'organizador' && userData.organizacaoId) {
          const res = await fetch(`${API_BASE_URL}/api/organizacoes/${userData.organizacaoId}`);
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
          const res = await fetch(`${API_BASE_URL}/api/organizacoes/${selectedOrgId}`);
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
      const res = await fetch(`${API_BASE_URL}/api/organizacoes/${selectedOrgId}`, {
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

// --- (ADICIONE ESTE NOVO COMPONENTE) ---
function ManageRankingConfigCard() {
  const { user } = useAuth();
  const [minXpJogadores, setMinXpJogadores] = useState(500);
  const [minXpFas, setMinXpFas] = useState(100);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Efeito para buscar as configurações atuais
  useEffect(() => {
    setLoading(true);
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/ranking`);
        const data = await res.json();
        if (res.ok) {
          setMinXpJogadores(data.minXpJogadores);
          setMinXpFas(data.minXpFas);
        } else {
          throw new Error(data.error || 'Erro ao carregar');
        }
      } catch (err) {
        setMessage(`Erro ao carregar: ${err.message}`);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []); // Roda uma vez
  
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/config/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ 
          minXpJogadores: Number(minXpJogadores), 
          minXpFas: Number(minXpFas) 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      
      setMessage(data.message);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  
  return (
    <form onSubmit={handleSave} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Configuração do Ranking</h2>
      <p className="text-gray-400 text-sm mb-4">
        Defina o XP mínimo necessário para que um usuário seja considerado "qualificado" no ranking sazonal (para a marcação visual).
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input 
          label="XP Mínimo (Jogadores)" 
          type="number" 
          value={minXpJogadores} 
          onChange={e => setMinXpJogadores(e.target.value)} 
          min="0" 
        />
        <Input 
          label="XP Mínimo (Fãs)" 
          type="number" 
          value={minXpFas} 
          onChange={e => setMinXpFas(e.target.value)} 
          min="0" 
        />
      </div>
      
      {message && (
        <p className={`text-center my-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      
      <Button primary type="submit" disabled={loading} className="mt-4">
        {loading ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </form>
  );
}

// Resetar ranking
function ResetRankingCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    setMessage('');
    
    // Dupla confirmação de segurança
    if (!window.confirm("ATENÇÃO: Você está prestes a ZERAR o XP de TODOS os jogadores e fãs. Esta ação é irreversível.")) {
      return;
    }
    if (!window.confirm("CONFIRMAÇÃO FINAL: Tem certeza ABSOLUTA que deseja resetar o ranking mensal?")) {
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/ranking/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar');
      
      setMessage(data.message); // Mensagem de sucesso
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  
  return (
    <div className="bg-gray-700 p-6 rounded-xl shadow-2xl mt-10 border-t-4 border-red-500">
      <h2 className="text-2xl font-semibold text-red-300 mb-4">Zona de Perigo: Resetar Ranking Mensal</h2>
      <p className="text-gray-300 mb-4">
        Ao clicar no botão abaixo, o campo `xpTotal` de **todos os usuários** (jogadores, fãs, organizadores) será permanentemente definido como **zero**.
      </p>
      <p className="text-gray-400 text-sm mb-4 italic">
        Isso NÃO afeta o histórico de campeonatos, missões completas, o 'Total Arrecadado' (R$) ou qualquer outro dado histórico. Apenas o ranking de XP.
      </p>
      
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      
      <Button 
        onClick={handleReset}
        disabled={loading}
        className="bg-red-700 text-white hover:bg-red-600 w-full"
      >
        {loading ? 'Resetando...' : 'Zerar Ranking Mensal de TODO MUNDO'}
      </Button>
    </div>
  );
}
// (Formulário CreateDonationForm)
function CreateDonationForm() {
  const { user } = useAuth();
  
  // Estado para o toggle
  const [donationType, setDonationType] = useState('corporate'); // 'corporate' ou 'fan'
  
  // Estados do formulário
  const [patrocinador, setPatrocinador] = useState(''); // Para 'corporate'
  const [selectedFanId, setSelectedFanId] = useState(''); // Para 'fan'
  const [valorTotal, setValorTotal] = useState(500);
  const [atividade, setAtividade] = useState('');
  const [xpOferecido, setXpOferecido] = useState(0);
  
  // Estado para a lista de fãs
  const [fanList, setFanList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Busca a lista de fãs (para o seletor 'fan')
  useEffect(() => {
    const fetchFans = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/fans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setFanList(data);
          if (data.length > 0) setSelectedFanId(data[0].id); // Seleciona o primeiro
        }
      } catch (err) {
        console.error("Erro ao buscar fãs:", err);
      }
    };
    fetchFans();
  }, [user]);

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    
    // Monta o body da requisição
    const body = {
      tipo: donationType,
      patrocinador: donationType === 'corporate' ? patrocinador : null,
      fanId: donationType === 'fan' ? selectedFanId : null,
      valorTotal: Number(valorTotal),
      atividade,
      xpOferecido: Number(xpOferecido)
    };
    
    // Validação
    if (donationType === 'corporate' && !body.patrocinador) {
      setMessage('Erro: Nome do patrocinador corporativo é obrigatório.');
      setLoading(false);
      return;
    }
    if (donationType === 'fan' && !body.fanId) {
      setMessage('Erro: Você deve selecionar um fã.');
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/donations`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(body)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar');
      
      setMessage(resData.message); // Exibe a msg de sucesso (ex: "Fã recebeu XP!")
      
      // Limpa formulário
      setPatrocinador(''); setSelectedFanId(fanList[0]?.id || ''); setValorTotal(500);
      setAtividade(''); setXpOferecido(0);
    } catch (err) {
      setMessage(`Erro: ${err.message}`);
    }
    setLoading(false);
  };
  
  const handleTypeChange = (newType) => {
    setDonationType(newType);
    setMessage(''); // Limpa mensagens
  };

  return (
    <form onSubmit={handleCreateDonation} className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-white mb-4">Novo Patrocínio (Donation)</h2>
      
      {/* --- NOVO: Toggle de Tipo --- */}
      <div className="flex mb-4 rounded-lg bg-gray-700 p-1">
        <button
          type="button"
          onClick={() => handleTypeChange('corporate')}
          className={`w-1/2 py-2 rounded-md font-semibold ${donationType === 'corporate' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
        >
          Corporativo
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('fan')}
          className={`w-1/2 py-2 rounded-md font-semibold ${donationType === 'fan' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
        >
          Bônus para Fã
        </button>
      </div>

      {/* --- Inputs Condicionais --- */}
      {donationType === 'corporate' ? (
        <Input label="Nome do Patrocinador (Ex: Coca-Cola)" type="text" value={patrocinador} onChange={e => setPatrocinador(e.target.value)} required />
      ) : (
        <UserSearchSelect
          label="Selecione o Fã"
          users={fanList}
          selectedUser={selectedFanId}
          onSelect={setSelectedFanId}
        />
      )}

      <Input label="Atividade / Causa" type="text" value={atividade} onChange={e => setAtividade(e.target.value)} placeholder="Ex: Patrocínio do Major de SP" required />
      <Input label="Valor Total (R$)" type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} min="0" required />
      <Input 
        label="XP Bônus Oferecido (para Fã)" 
        type="number" 
        value={xpOferecido} 
        onChange={e => setXpOferecido(e.target.value)} 
        min="0" 
        disabled={donationType === 'corporate'} // Desabilita se for corporativo
      />
      {donationType === 'corporate' && <p className="text-xs text-gray-500 -mt-3 mb-4">XP Bônus só é aplicado para "Bônus para Fã".</p>}
      
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Button primary type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar Patrocínio'}</Button>
    </form>
  );
}

// --- FORMULÁRIO DE RESULTADOS (MODIFICADO) ---
function FinalizeChampionshipForm() {
  const { user, userData } = useAuth();
  const [championships, setChampionships] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedChamp, setSelectedChamp] = useState('');
  // O estado 'top8Players' agora guarda o ID ou a string "manual"
  const [top8Players, setTop8Players] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', });
  // NOVO: Estado para os nomes manuais
  const [manualNames, setManualNames] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
  
  const [participationPlayers, setParticipationPlayers] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // ... (useEffect de busca de dados continua o mesmo) ...
    const fetchData = async () => {
      if (!user || !userData) return; setLoadingData(true); setMessage(''); 
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const champsRes = await fetch(`${API_BASE_URL}/api/admin/my-championships`, { headers });
        const champsData = await champsRes.json();
        if (champsRes.ok) {
          const abertos = champsData.filter(c => c.status !== 'finalizado');
          setChampionships(abertos);
          if (abertos.length > 0) setSelectedChamp(abertos[0].id);
        } else { throw new Error(champsData.error || 'Erro ao buscar seus campeonatos'); }
        const playersRes = await fetch(`${API_BASE_URL}/api/players`, { headers });
        const playersData = await playersRes.json();
        if (playersRes.ok) { setAllPlayers(playersData); } 
        else { throw new Error(playersData.error || 'Erro ao buscar jogadores'); }
      } catch (err) { setMessage(`Erro ao carregar dados: ${err.message}`); }
      setLoadingData(false);
    };
    fetchData();
  }, [user, userData]); 

  const handleTop8Change = (position, playerId) => {
    setTop8Players(prev => ({ ...prev, [position]: playerId, }));
  };
  // NOVO: Handler para o input de nome manual
  const handleManualNameChange = (position, name) => {
    setManualNames(prev => ({ ...prev, [position]: name }));
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
    
    // --- LÓGICA DO SUBMIT ATUALIZADA ---
    const top8Data = Object.entries(top8Players)
      .filter(([pos, id]) => id) // Filtra posições não preenchidas
      .map(([pos, id]) => {
        const posicao = parseInt(pos, 10);
        if (id === 'manual') {
          // Se for manual, envia o nome manual e 0 XP
          return { jogadorId: null, nomeManual: manualNames[pos], posicao: posicao };
        } else {
          // Se for jogador, envia o ID
          return { jogadorId: id, nomeManual: null, posicao: posicao };
        }
      });
    // --- FIM DA LÓGICA ---
      
    const participationData = participationPlayers.map(p => p.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/championships/${selectedChamp}/finalize`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ top8: top8Data, participation: participationData })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar resultado');
      setMessage(resData.message); 
      setTop8Players({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
      setManualNames({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
      setParticipationPlayers([]);
      
      const newList = championships.filter(c => c.id !== selectedChamp);
      setChampionships(newList);
      setSelectedChamp(newList.length > 0 ? newList[0].id : '');

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
      <h2 className="text-2xl font-semibold text-white mb-6">Lançar Resultado Padrão (Baseado em XP)</h2>
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Select label="Selecione o Campeonato (Abertos)" value={selectedChamp} onChange={e => setSelectedChamp(e.target.value)} required>
        {championships.length === 0 ? (
          <option>Nenhum campeonato aberto encontrado</option>
        ) : (
          championships.map(champ => (
            <option key={champ.id} value={champ.id}>{champ.nome} {userData.tipo === 'admin' ? `(${champ.organizadorNome})` : ''}</option>
          ))
        )}
      </Select>
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Vencedores (Top 8)</h3>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(pos => (
          // --- MUDANÇA: Renderização condicional do input manual ---
          <div key={pos}>
            <Select label={`${pos}º Lugar`} value={top8Players[pos]} onChange={e => handleTop8Change(pos, e.target.value)}>
              <option value="">-- Selecione um Jogador --</option>
              <option value="manual">-- Inserir Manualmente --</option>
              {allPlayers.map(player => ( <option key={player.id} value={player.id}>{player.nome}</option> ))}
            </Select>
            {top8Players[pos] === 'manual' && (
              <Input 
                type="text"
                placeholder="Nome do Jogador não cadastrado"
                value={manualNames[pos]}
                onChange={e => handleManualNameChange(pos, e.target.value)}
                className="mt-2"
              />
            )}
          </div>
        ))}
      </div>
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Participação (9º+)</h3>
      <p className="text-sm text-gray-400 mb-4">Adicione todos os outros jogadores que participaram e ganharão 10% do XP Base.</p>
      <PlayerMultiSelect label="Adicionar Jogadores (9º+)" players={allPlayers} selectedPlayers={participationPlayers} onSelect={handleParticipationSelect} onDeselect={handleParticipationDeselect} />
      
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
  
  const [top8Data, setTop8Data] = useState({ 1: { id: '', xp: '' }, 2: { id: '', xp: '' }, 3: { id: '', xp: '' }, 4: { id: '', xp: '' }, 5: { id: '', xp: '' }, 6: { id: '', xp: '' }, 7: { id: '', xp: '' }, 8: { id: '', xp: '' }, });
  // NOVO: Estado para os nomes manuais
  const [manualCustomNames, setManualCustomNames] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
  
  const [participationPlayers, setParticipationPlayers] = useState([]); 
  const [participationXp, setParticipationXp] = useState(10); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // ... (useEffect de busca de dados continua o mesmo) ...
    const fetchData = async () => {
      if (!user || !userData) return; setLoadingData(true); setMessage(''); 
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const champsRes = await fetch(`${API_BASE_URL}/api/admin/my-championships`, { headers });
        const champsData = await champsRes.json();
        if (champsRes.ok) {
          const abertos = champsData.filter(c => c.status !== 'finalizado');
          setChampionships(abertos);
          if (abertos.length > 0) setSelectedChamp(abertos[0].id);
        } else { throw new Error(champsData.error || 'Erro ao buscar seus campeonatos'); }
        const playersRes = await fetch(`${API_BASE_URL}/api/players`, { headers });
        const playersData = await playersRes.json();
        if (playersRes.ok) { setAllPlayers(playersData); } 
        else { throw new Error(playersData.error || 'Erro ao buscar jogadores'); }
      } catch (err) { setMessage(`Erro ao carregar dados: ${err.message}`); }
      setLoadingData(false);
    };
    fetchData();
  }, [user, userData]); 

  // --- HANDLERS ATUALIZADOS ---
  const handleTop8PlayerChange = (pos, playerId) => {
    // Se selecionou 'manual', zera o XP (conforme sua solicitação)
    const newXp = (playerId === 'manual') ? '0' : top8Data[pos].xp;
    setTop8Data(prev => ({ ...prev, [pos]: { id: playerId, xp: newXp } }));
  };
  const handleTop8XpChange = (pos, xp) => {
    setTop8Data(prev => ({ ...prev, [pos]: { ...prev[pos], xp: xp } }));
  };
  const handleManualCustomNameChange = (pos, name) => {
    setManualCustomNames(prev => ({ ...prev, [pos]: name }));
  };
  // --- FIM DOS HANDLERS ---
  
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
    
    // --- LÓGICA DO SUBMIT ATUALIZADA ---
    const top8DataFormatted = Object.entries(top8Data)
      .map(([pos, data]) => {
        const posicao = parseInt(pos, 10);
        // Se for manual
        if (data.id === 'manual') {
          return { jogadorId: null, nomeManual: manualCustomNames[pos], posicao: posicao, xpGanho: 0 };
        }
        // Se for jogador registrado
        if (data.id && Number(data.xp) > 0) {
          return { jogadorId: data.id, nomeManual: null, posicao: posicao, xpGanho: Number(data.xp) };
        }
        return null; // Ignora se não tiver ID ou XP
      })
      .filter(Boolean); // Limpa os nulos
    // --- FIM DA LÓGICA ---
      
    const participationDataFormatted = { jogadorIds: participationPlayers.map(p => p.id), xpGanho: Number(participationXp) };
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/championships/${selectedChamp}/finalize-custom`, { 
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ top8: top8DataFormatted, participation: participationDataFormatted })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar resultado');
      setMessage(resData.message); 
      setTop8Data({ 1: { id: '', xp: '' }, 2: { id: '', xp: '' }, 3: { id: '', xp: '' }, 4: { id: '', xp: '' }, 5: { id: '', xp: '' }, 6: { id: '', xp: '' }, 7: { id: '', xp: '' }, 8: { id: '', xp: '' } });
      setManualCustomNames({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '' });
      setParticipationPlayers([]);
      setParticipationXp(10);
      
      const newList = championships.filter(c => c.id !== selectedChamp);
      setChampionships(newList);
      setSelectedChamp(newList.length > 0 ? newList[0].id : '');
      
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
      {message && (
        <p className={`text-center mb-4 ${message.startsWith('Erro') ? 'text-red-400' : 'text-teal-300'}`}>{message}</p>
      )}
      <Select label="Selecione o Campeonato (Abertos)" value={selectedChamp} onChange={e => setSelectedChamp(e.target.value)} required>
        {championships.length === 0 ? (
          <option>Nenhum campeonato aberto encontrado</option>
        ) : (
          championships.map(champ => (
            <option key={champ.id} value={champ.id}>
              {champ.nome} {userData.tipo === 'admin' ? `(${champ.organizadorNome})` : ''}
            </option>
          ))
        )}
      </Select>
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Vencedores (Top 8)</h3>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(pos => {
        // Verifica se a opção manual está selecionada para esta posição
        const isManual = top8Data[pos].id === 'manual';
        
        return (
          <div key={pos} className="grid grid-cols-6 gap-2 items-end mb-2">
            <span className="col-span-1 text-gray-300 font-bold self-center mb-4">{pos}º:</span>
            <div className="col-span-3">
              <Select label={pos === 1 ? "Jogador" : ""} value={top8Data[pos].id} onChange={e => handleTop8PlayerChange(pos, e.target.value)} >
                <option value="">-- Selecione Jogador --</option>
                <option value="manual">-- Inserir Manualmente --</option>
                {allPlayers.map(player => ( <option key={player.id} value={player.id}>{player.nome}</option> ))}
              </Select>
            </div>
            <div className="col-span-2">
               <Input 
                 label={pos === 1 ? "XP Manual" : ""} 
                 type="number" 
                 value={top8Data[pos].xp} 
                 onChange={e => handleTop8XpChange(pos, e.target.value)} 
                 placeholder="XP" 
                 min="0"
                 disabled={isManual} // <-- DESABILITA SE FOR MANUAL
                 title={isManual ? "XP não pode ser dado a jogadores não cadastrados" : ""}
               />
            </div>
            {/* Input de Nome Manual (só aparece se 'manual' for selecionado) */}
            {isManual && (
              <div className="col-start-2 col-span-5">
                <Input 
                  type="text"
                  placeholder="Nome do Jogador não cadastrado"
                  value={manualCustomNames[pos]}
                  onChange={e => handleManualCustomNameChange(pos, e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
          </div>
        )
      })}
      <hr className="border-gray-600 my-6" />
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Participação (9º+)</h3>
      <Input label="XP Manual para TODOS 9º+" type="number" value={participationXp} onChange={e => setParticipationXp(e.target.value)} min="0" />
      <PlayerMultiSelect label="Adicionar Jogadores (9º+)" players={allPlayers} selectedPlayers={participationPlayers} onSelect={handleParticipationSelect} onDeselect={handleParticipationDeselect} />
      
      <Button primary type="submit" disabled={loading || allPlayers.length === 0 || championships.length === 0}>
        {loading ? 'Finalizando...' : 'Finalizar Lançamento Customizado'}
      </Button>
    </form>
  );
}
