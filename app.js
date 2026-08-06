// 1. IMPORTAÇÕES
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    onSnapshot, 
    where, 
    doc, 
    setDoc, 
    getDocs,
    limitToLast,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// 2. CONFIGURAÇÕES
const firebaseConfig = {
    apiKey: "AIzaSyBrZtajEMjT1JQv8T_PqmrJggEwB2STyK8",
    authDomain: "zero-167b7.firebaseapp.com",
    projectId: "zero-167b7",
    storageBucket: "zero-167b7.firebasestorage.app",
    messagingSenderId: "61684756342",
    appId: "1:61684756342:web:2de18a347dc2cc7fd9d457"
};

// 3. INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

let usuarioLogado = null;

// ==========================================
// ELEMENTOS DE AUTENTICAÇÃO
// ==========================================
const modalLogin = document.getElementById('modal-login');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnEntrarEmail = document.getElementById('btn-entrar-email');
const btnCadastrarEmail = document.getElementById('btn-cadastrar-email');
const authUsuario = document.getElementById('auth-usuario');
const authSenha = document.getElementById('auth-senha');
const authErro = document.getElementById('auth-erro');
const btnLoginHeader = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

// MONITOR DE LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioLogado = user;
        modalLogin.style.display = 'none';
        btnLogout.style.display = 'inline-block';

        const nomeParaMostrar = user.displayName || user.email.split('@')[0];
        if (btnLoginHeader) btnLoginHeader.innerText = `Olá, ${nomeParaMostrar}`;

        try {
            await setDoc(doc(db, "usuarios", user.uid), { nome: nomeParaMostrar });
        } catch (erro) {
            console.error("Erro ao salvar usuário:", erro);
        }

    } else {
        usuarioLogado = null;
        modalLogin.style.display = 'flex';
        btnLogout.style.display = 'none';
        if (btnLoginHeader) btnLoginHeader.innerText = "Faça Login";
    }

    carregarTabela(abaAtual);
});

// A) BOTÃO SAIR (LOGOUT)
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        alert("Você saiu da sua conta!");
    }).catch((erro) => {
        console.error("Erro ao sair:", erro);
    });
});

// B) LOGIN COM GOOGLE
btnLoginGoogle.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((erro) => {
        authErro.innerText = "Erro ao entrar com Google.";
        console.error(erro);
    });
});

// C) AUXILIAR: Transforma Nickname em E-mail
function criarEmailFicticio(nickname) {
    const nickLimpo = nickname.trim().toLowerCase().replace(/\s+/g, '');
    return `${nickLimpo}@meucampeonato.com`;
}

// D) LOGIN COM USUÁRIO / SENHA
btnEntrarEmail.addEventListener('click', () => {
    const usuario = authUsuario.value;
    const senha = authSenha.value;

    if (!usuario || !senha) {
        authErro.innerText = "Preencha usuário e senha.";
        return;
    }

    const emailFicticio = criarEmailFicticio(usuario);

    signInWithEmailAndPassword(auth, emailFicticio, senha)
        .catch((erro) => {
            authErro.innerText = "Usuário ou senha incorretos.";
            console.error(erro);
        });
});

// E) CRIAR CONTA COM USUÁRIO / SENHA
btnCadastrarEmail.addEventListener('click', async () => {
    const usuario = authUsuario.value.trim();
    const senha = authSenha.value;

    if (!usuario || !senha) {
        authErro.innerText = "Preencha usuário e senha para cadastrar.";
        return;
    }

    if (senha.length < 6) {
        authErro.innerText = "A senha deve ter pelo menos 6 caracteres.";
        return;
    }

    const emailFicticio = criarEmailFicticio(usuario);

    try {
        const credencial = await createUserWithEmailAndPassword(auth, emailFicticio, senha);

        await updateProfile(credencial.user, {
            displayName: usuario
        });

        alert(`Conta do usuário "${usuario}" criada com sucesso!`);
        window.location.reload();

    } catch (erro) {
        if (erro.code === 'auth/email-already-in-use') {
            authErro.innerText = "Este nome de usuário já está em uso.";
        } else {
            authErro.innerText = "Erro ao criar conta.";
        }
        console.error(erro);
    }
});

// ==========================================
// FUNÇÕES ÚTEIS
// ==========================================
function formatarLinks(texto) {
    const regex = /(https?:\/\/[^\s]+)/g;
    return texto.replace(regex, function (url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-accent); text-decoration: underline;">${url}</a>`;
    });
}

function getNomeColecao(categoria) {
    if (!categoria) return 'copa_do_mundo';
    const cat = categoria.toLowerCase();
    if (cat.includes('brasil')) return 'brasileirao';
    return 'copa_do_mundo';
}

// ==========================================
// SISTEMA DE CHAT
// ==========================================
const inputMensagem = document.getElementById('input-mensagem');
const btnEnviar = document.getElementById('btn-enviar');
const areaMensagens = document.getElementById('area-mensagens');

inputMensagem.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnEnviar.click();
    }
});

btnEnviar.addEventListener('click', async () => {
    const texto = inputMensagem.value;

    if (texto.trim() === "") return;

    if (!usuarioLogado) {
        modalLogin.style.display = 'flex';
        return;
    }

    inputMensagem.value = "";

    const nomeAutor = usuarioLogado.displayName || usuarioLogado.email.split('@')[0];
    const fotoURL = usuarioLogado.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeAutor)}&background=random`;

    try {
        await addDoc(collection(db, "mensagens"), {
            texto: texto,
            autor: nomeAutor,
            foto: fotoURL,
            data_hora: serverTimestamp()
        });

        const snapshotMensagens = await getDocs(query(collection(db, "mensagens"), orderBy("data_hora", "asc")));
        if (snapshotMensagens.size > 50) {
            const excesso = snapshotMensagens.size - 50;
            for (let i = 0; i < excesso; i++) {
                await deleteDoc(doc(db, "mensagens", snapshotMensagens.docs[i].id));
            }
        }
    } catch (erro) {
        console.error("ERRO AO SALVAR MENSAGEM:", erro);
    }
});

// ESCUTADOR DO CHAT EM TEMPO REAL
const consultaChat = query(
    collection(db, "mensagens"),
    orderBy("data_hora", "asc"),
    limitToLast(50)
);

let mensagensCarregadasPrimeiraVez = false;

onSnapshot(consultaChat, (snapshot) => {
    areaMensagens.innerHTML = "";
    const totalDocs = snapshot.docs.length;

    snapshot.docs.forEach((docSnap, index) => {
        const msg = docSnap.data();
        const textoFormatado = formatarLinks(msg.texto);

        let horarioTexto = "";
        if (msg.data_hora) {
            const data = msg.data_hora.toDate();
            horarioTexto = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else {
            const dataLocal = new Date();
            horarioTexto = dataLocal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        const ehUltimaMsg = (index === totalDocs - 1);
        const classeAnimacao = (mensagensCarregadasPrimeiraVez && ehUltimaMsg) ? "mensagem-nova" : "";

        areaMensagens.innerHTML += `
            <div class="${classeAnimacao}" style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                <img src="${msg.foto}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; margin-top: 2px;">
                <div>
                    <strong style="font-size: 12px; color: var(--yellow-accent);">${msg.autor}</strong> 
                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 5px;">${horarioTexto}</span><br>
                    <span>${textoFormatado}</span>
                </div>
            </div>
        `;
    });

    mensagensCarregadasPrimeiraVez = true;
    areaMensagens.scrollTop = areaMensagens.scrollHeight;
});

// ==========================================
// LISTA DE ADMINISTRADORES
// ==========================================
const ADMINS = [
    "Wilkes",
    "Wilkes@meucampeonato.com",
    "vitorwilkes99@gmail.com"
];

function ehAdmin(user) {
    if (!user) return false;
    const email = user.email || "";
    const nick = user.displayName || "";
    const nickDoEmail = email.split('@')[0];

    return ADMINS.includes(email) || ADMINS.includes(nick) || ADMINS.includes(nickDoEmail);
}

// ==========================================
// SISTEMA DE TABELAS EM TEMPO REAL (SEM PERDER DADOS)
// ==========================================
let abaAtual = 'Copa do Mundo';
let unsubscribeTabela = null; 

const botoesAbas = document.querySelectorAll('.aba');
const tituloTabela = document.querySelector('.conteudo-tabela h2');
const cabecalhoTabela = document.querySelector('#cabecalho-tabela');
const corpoTabela = document.querySelector('#corpo-tabela');
const formAddJogador = document.getElementById('form-add-jogador');

botoesAbas.forEach(botao => {
    botao.addEventListener('click', function() {
        botoesAbas.forEach(b => b.classList.remove('ativa'));
        this.classList.add('ativa');
        abaAtual = this.innerText.trim();
        tituloTabela.innerText = `Ranking - ${abaAtual}`;
        carregarTabela(abaAtual);
    });
});

async function carregarDropdownUsuarios() {
    const datalist = document.getElementById('lista-usuarios');
    if (!datalist) return;
    
    try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        datalist.innerHTML = '';
        snapshot.forEach(docSnap => {
            datalist.innerHTML += `<option value="${docSnap.data().nome}">`;
        });
    } catch (e) {
        console.error("Erro ao carregar dropdown:", e);
    }
}

function carregarTabela(categoria) {
    const souAdmin = ehAdmin(usuarioLogado);

    if (formAddJogador) {
        formAddJogador.style.display = souAdmin ? 'flex' : 'none';
        if (souAdmin) carregarDropdownUsuarios();
    }

    const nomeColecao = getNomeColecao(categoria);

    if (nomeColecao === 'copa_do_mundo') {
        cabecalhoTabela.innerHTML = `<tr><th>Jogador</th><th>🏆 Campeão</th><th>🥈 Vice</th>${souAdmin ? '<th>Ações</th>' : ''}</tr>`;
    } else {
        cabecalhoTabela.innerHTML = `<tr><th>Jogador</th><th>🏆 Campeão</th><th>🔻 Rebaixado</th>${souAdmin ? '<th>Ações</th>' : ''}</tr>`;
    }

    const refColecao = collection(db, nomeColecao);

    if (unsubscribeTabela) {
        unsubscribeTabela();
        unsubscribeTabela = null;
    }

    // Escutador direto na coleção
    unsubscribeTabela = onSnapshot(refColecao, (snapshot) => {
        corpoTabela.innerHTML = "";

        if (snapshot.empty) {
            const colunas = souAdmin ? 4 : 3;
            corpoTabela.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhum jogador cadastrado nesta tabela.</td></tr>`;
            return;
        }

        // Converte para lista e ordena via JavaScript (Sem falhas no Firebase)
        const listaJogadores = [];
        snapshot.forEach((docSnap) => {
            listaJogadores.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // Ordenação decrescente por Títulos
        listaJogadores.sort((a, b) => (Number(b.titulos) || 0) - (Number(a.titulos) || 0));

        listaJogadores.forEach((jogador) => {
            const idDoc = jogador.id;
            const titulos = Number(jogador.titulos) || 0;
            const vices = Number(jogador.vices) || 0;
            const rebaixamentos = Number(jogador.rebaixamentos) || 0;

            let colunaAtributo2 = "";
            let celulaAcoes = "";

            if (nomeColecao === 'copa_do_mundo') {
                colunaAtributo2 = `🥈 ${vices}`;
                if (souAdmin) {
                    celulaAcoes = `
                        <td>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'titulos', ${titulos + 1})">+1 🏆</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'titulos', ${Math.max(0, titulos - 1)})">-1 🏆</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'vices', ${vices + 1})">+1 🥈</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'vices', ${Math.max(0, vices - 1)})">-1 🥈</button>
                            <button onclick="deletarJogador('${nomeColecao}', '${idDoc}')">Excluir</button>
                        </td>
                    `;
                }
            } else {
                colunaAtributo2 = `🔻 ${rebaixamentos}`;
                if (souAdmin) {
                    celulaAcoes = `
                        <td>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'titulos', ${titulos + 1})">+1 🏆</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'titulos', ${Math.max(0, titulos - 1)})">-1 🏆</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'rebaixamentos', ${rebaixamentos + 1})">+1 🔻</button>
                            <button onclick="alterarAtributo('${nomeColecao}', '${idDoc}', 'rebaixamentos', ${Math.max(0, rebaixamentos - 1)})">-1 🔻</button>
                            <button onclick="deletarJogador('${nomeColecao}', '${idDoc}')">Excluir</button>
                        </td>
                    `;
                }
            }

            corpoTabela.innerHTML += `
                <tr>
                    <td><strong>${jogador.nome}</strong></td>
                    <td>🏆 ${titulos}</td>
                    <td>${colunaAtributo2}</td>
                    ${celulaAcoes}
                </tr>
            `;
        });
    }, (erro) => {
        console.error("Erro ao carregar dados da tabela:", erro);
    });
}

// ADICIONAR JOGADOR EM TEMPO REAL
const btnAddJogador = document.getElementById('btn-add-jogador');
if (btnAddJogador) {
    btnAddJogador.addEventListener('click', async () => {
        const inputElement = document.getElementById('novo-jogador-nome');
        const nome = inputElement.value.trim();

        if (!nome) {
            alert("Digite ou selecione um jogador da lista!");
            return;
        }

        const nomeColecao = getNomeColecao(abaAtual);

        try {
            const consultaExistencia = query(collection(db, nomeColecao), where("nome", "==", nome));
            const snapshotExistencia = await getDocs(consultaExistencia);

            if (!snapshotExistencia.empty) {
                alert(`O jogador "${nome}" já está nesta tabela!`);
                return;
            }

            await addDoc(collection(db, nomeColecao), {
                nome: nome,
                titulos: 0,
                vices: 0,
                rebaixamentos: 0
            });
            
            inputElement.value = ""; 
        } catch (erro) {
            console.error("Erro ao adicionar jogador:", erro);
        }
    });
}

// FUNÇÕES DE ADMINISTRAÇÃO DA TABELA
window.alterarAtributo = async (colecao, idDoc, campo, novoValor) => {
    try {
        const docRef = doc(db, colecao, idDoc);
        await updateDoc(docRef, { [campo]: novoValor });
    } catch (erro) {
        console.error("Erro ao atualizar:", erro);
    }
};

window.deletarJogador = async (colecao, idDoc) => {
    if (confirm("Tem certeza que deseja remover este jogador?")) {
        try {
            await deleteDoc(doc(db, colecao, idDoc));
        } catch (erro) {
            console.error("Erro ao deletar:", erro);
        }
    }
};

// Inicializa a tabela
carregarTabela(abaAtual);

// ==========================================
// SISTEMA DE REGRAS (POP-UP)
// ==========================================
const btnRegras = document.getElementById('btn-regras');
const modalRegras = document.getElementById('modal-regras');
const btnFecharRegras = document.getElementById('btn-fechar-regras');

if (btnRegras) {
    btnRegras.addEventListener('click', () => {
        modalRegras.style.display = 'flex';
    });
}

if (btnFecharRegras) {
    btnFecharRegras.addEventListener('click', () => {
        modalRegras.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target === modalRegras) {
        modalRegras.style.display = 'none';
    }
});