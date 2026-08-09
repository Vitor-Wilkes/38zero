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
    botao.addEventListener('click', function () {
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

    // Mostrar ou esconder botão de criar enquete
    const btnAbrirFormEnquete = document.getElementById('btn-abrir-form-enquete');
    if (btnAbrirFormEnquete) btnAbrirFormEnquete.style.display = souAdmin ? 'block' : 'none';

    if (formAddJogador) {
        formAddJogador.style.display = souAdmin ? 'flex' : 'none';
        if (souAdmin) carregarDropdownUsuarios();
    }

    // LINHAS NOVAS AQUI: Mostra ou esconde o botão de Anúncios
    const btnAbrirFormAnuncio = document.getElementById('btn-abrir-form-anuncio');
    if (btnAbrirFormAnuncio) {
        btnAbrirFormAnuncio.style.display = souAdmin ? 'block' : 'none';
    }
    // ...

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
        // Converte para lista e ordena via JavaScript (Sem falhas no Firebase)
        const listaJogadores = [];
        snapshot.forEach((docSnap) => {
            listaJogadores.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // NOVA ORDENAÇÃO CORRIGIDA
        listaJogadores.sort((a, b) => {
            // Garantindo que os valores sejam lidos como números pelo JavaScript
            const titulosA = Number(a.titulos) || 0;
            const titulosB = Number(b.titulos) || 0;
            const vicesA = Number(a.vices) || 0;
            const vicesB = Number(b.vices) || 0;
            const rebA = Number(a.rebaixamentos) || 0;
            const rebB = Number(b.rebaixamentos) || 0;

            // 1º Critério GERAL: Quem tem MAIS títulos (Campeão) fica em cima
            if (titulosB !== titulosA) {
                return titulosB - titulosA;
            }

            // 2º Critério de DESEMPATE: Depende da tabela que está aberta
            if (nomeColecao === 'copa_do_mundo') {
                // Na Copa do Mundo: Quem tem MAIS vices ganha o desempate
                if (vicesB !== vicesA) {
                    return vicesB - vicesA;
                }
            } else {
                // No Brasileirão: Quem tem MENOS rebaixamentos ganha o desempate
                if (rebA !== rebB) {
                    return rebA - rebB;
                }
            }

            // 3º Critério FINAL: Ordem alfabética se empatarem em tudo
            return (a.nome || "").localeCompare(b.nome || "");
        });
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

// ==========================================
// SISTEMA DE ANÚNCIOS GLOBAIS (POP-UP)
// ==========================================
let ultimoAnuncioVisto = Date.now(); // Ignora anúncios antigos ao carregar a página

// 1. Escutando o Firestore em Tempo Real
onSnapshot(doc(db, "sistema", "anuncio_global"), (docSnap) => {
    if (docSnap.exists()) {
        const dados = docSnap.data();

        // Se existir um anúncio novo (com timestamp maior que o último visto)
        if (dados.timestamp > ultimoAnuncioVisto) {
            ultimoAnuncioVisto = dados.timestamp; // Atualiza a trava
            exibirPopUpAnuncio(dados);
        }
    }
});

// 2. Função que constrói e mostra o Pop-up
function exibirPopUpAnuncio(dados) {
    const modal = document.getElementById('popup-anuncio');
    const titulo = document.getElementById('popup-titulo');
    const img = document.getElementById('popup-img');
    const nome = document.getElementById('popup-nome');
    const msg = document.getElementById('popup-msg');

    if (!modal) return;

    nome.innerText = dados.jogador;
    msg.innerText = dados.mensagem;
    modal.style.display = 'flex'; // Exibe o fundo escuro

    if (dados.tipo === 'campeao') {
        titulo.innerText = '🏆 TEMOS UM CAMPEÃO!';
        titulo.style.color = '#d6aa1b';
        img.style.display = 'none';

        // Chuva de confetes!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.5 },
                zIndex: 9999999
            });
        }

    } else if (dados.tipo === 'vice') {
        titulo.innerText = '🥈 VICE-CAMPEÃO';
        titulo.style.color = '#bdc3c7';
        img.src = dados.imgUrl;
        img.style.display = 'block';

    } else if (dados.tipo === 'rebaixado') {
        titulo.innerText = '📉 FOI DE VASCO!';
        titulo.style.color = '#e74c3c';
        img.src = dados.imgUrl;
        img.style.display = 'block';
    }
}

// 3. Abrir o modal de criação (Somente ADM)
const btnAbrirFormAnuncio = document.getElementById('btn-abrir-form-anuncio');
if (btnAbrirFormAnuncio) {
    btnAbrirFormAnuncio.addEventListener('click', () => {
        document.getElementById('modal-criar-anuncio').style.display = 'flex';
    });
}

// 4. Disparar Anúncio (Envia pro Firestore)
const btnEnviarAnuncio = document.getElementById('btn-enviar-anuncio');
if (btnEnviarAnuncio) {
    btnEnviarAnuncio.addEventListener('click', async () => {
        const tipo = document.getElementById('anuncio-tipo').value;
        const jogador = document.getElementById('anuncio-nome').value;
        const mensagem = document.getElementById('anuncio-msg').value;
        const imgUrl = document.getElementById('anuncio-img').value;

        if (!jogador || !mensagem) {
            alert('Preencha pelo menos o nome e a mensagem!');
            return;
        }
        if (tipo !== 'campeao' && !imgUrl) {
            alert('Para Vice e Rebaixado, é obrigatório colocar o link da imagem/GIF!');
            return;
        }

        try {
            // Salva no Banco de Dados Firestore
            await setDoc(doc(db, "sistema", "anuncio_global"), {
                tipo: tipo,
                jogador: jogador,
                mensagem: mensagem,
                imgUrl: imgUrl || "",
                timestamp: Date.now()
            });

            // Limpa os campos e fecha o modal
            document.getElementById('anuncio-nome').value = '';
            document.getElementById('anuncio-msg').value = '';
            document.getElementById('anuncio-img').value = '';
            document.getElementById('modal-criar-anuncio').style.display = 'none';
        } catch (erro) {
            console.error("Erro ao disparar anúncio:", erro);
        }
    });
}

// ==========================================
// SISTEMA DE ENQUETES (NOVO COM TEMPO E MÚLTIPLAS OPÇÕES)
// ==========================================
let enqueteAtualDados = null;
let intervaloTimerEnquete = null;

// 1. Escutando a Enquete em Tempo Real
onSnapshot(doc(db, "sistema", "enquete_atual"), (docSnap) => {
    const areaEnquete = document.getElementById('area-enquete');
    if (!areaEnquete) return;

    if (docSnap.exists() && docSnap.data().ativa) {
        enqueteAtualDados = docSnap.data();
        areaEnquete.style.display = 'block';
        renderizarEnquete();
    } else {
        enqueteAtualDados = null;
        areaEnquete.style.display = 'none';
        if (intervaloTimerEnquete) clearInterval(intervaloTimerEnquete);
    }
});

// 2. Renderizar na Tela
function renderizarEnquete() {
    if (!enqueteAtualDados || !enqueteAtualDados.ativa) return;
    
    if (intervaloTimerEnquete) clearInterval(intervaloTimerEnquete);

    document.getElementById('enquete-pergunta').innerText = `📊 ${enqueteAtualDados.pergunta}`;
    const divOpcoes = document.getElementById('enquete-opcoes');
    divOpcoes.innerHTML = '';

    const souAdmin = ehAdmin(usuarioLogado);
    const btnEncerrar = document.getElementById('btn-encerrar-enquete');
    if (btnEncerrar) btnEncerrar.style.display = souAdmin ? 'block' : 'none';

    // Timer visual
    const divTimer = document.createElement('div');
    divTimer.id = 'enquete-timer';
    divTimer.style.cssText = 'text-align: center; color: var(--yellow-accent); font-weight: bold; margin-bottom: 10px; font-size: 14px;';
    divOpcoes.appendChild(divTimer);

    const containerOpcoes = document.createElement('div');
    divOpcoes.appendChild(containerOpcoes);

    let jaVotou = usuarioLogado && enqueteAtualDados.votaram && enqueteAtualDados.votaram.includes(usuarioLogado.uid);
    
    let totalVotos = 0;
    if (enqueteAtualDados.opcoes) {
        enqueteAtualDados.opcoes.forEach(op => totalVotos += op.votos);
    }

    const renderizarOpcoes = (bloqueado = false) => {
        containerOpcoes.innerHTML = '';
        if (!enqueteAtualDados.opcoes) return;

        enqueteAtualDados.opcoes.forEach((op, index) => {
            if (!jaVotou && usuarioLogado && !bloqueado) {
                const btn = document.createElement('button');
                btn.className = 'enquete-opcao-btn';
                btn.innerText = op.texto;
                
                btn.onclick = async () => {
                    if (!usuarioLogado || !enqueteAtualDados) return;
                    
                    // Copiamos os arrays para atualizar localmente antes de enviar ao Firebase
                    let novasOpcoes = [...enqueteAtualDados.opcoes];
                    novasOpcoes[index].votos += 1;
                    
                    let novosVotaram = enqueteAtualDados.votaram ? [...enqueteAtualDados.votaram] : [];
                    novosVotaram.push(usuarioLogado.uid);

                    try {
                        await updateDoc(doc(db, "sistema", "enquete_atual"), {
                            opcoes: novasOpcoes,
                            votaram: novosVotaram
                        });
                    } catch (erro) {
                        console.error("Erro ao votar:", erro);
                    }
                };
                containerOpcoes.appendChild(btn);
            } else {
                const pct = totalVotos === 0 ? 0 : Math.round((op.votos / totalVotos) * 100);
                containerOpcoes.innerHTML += `
                    <div class="enquete-barra-container">
                        <div class="enquete-barra-progresso" style="width: ${pct}%"></div>
                        <div class="enquete-texto-barra">
                            <span>${op.texto}</span>
                            <span>${pct}% (${op.votos})</span>
                        </div>
                    </div>
                `;
            }
        });
    };

    renderizarOpcoes();

    if (!usuarioLogado) {
        divOpcoes.innerHTML += `<p style="font-size: 11px; color: var(--orange-accent); text-align:center; margin-top:5px;">Faça login para votar.</p>`;
    }

    // Lógica do Cronômetro
    const atualizarTimer = () => {
        if (!enqueteAtualDados || !enqueteAtualDados.terminaEm) return;
        
        const agora = Date.now();
        const resto = enqueteAtualDados.terminaEm - agora;

        if (resto <= 0) {
            clearInterval(intervaloTimerEnquete);
            divTimer.innerText = "⏳ Votação Encerrada!";
            divTimer.style.color = 'var(--orange-accent)';
            renderizarOpcoes(true); // Bloqueia

            // Apenas o Admin dispara o encerramento oficial para não mandar 50 mensagens no chat
            if (souAdmin) {
                encerrarEnqueteOficial();
            }
        } else {
            const min = Math.floor(resto / 60000);
            const sec = Math.floor((resto % 60000) / 1000);
            divTimer.innerText = `⏳ Restam: ${min}:${sec.toString().padStart(2, '0')}`;
        }
    };
    
    atualizarTimer();
    intervaloTimerEnquete = setInterval(atualizarTimer, 1000);
}

// 3. Função que encerra e manda o resultado pro Chat
async function encerrarEnqueteOficial() {
    if (!enqueteAtualDados || !enqueteAtualDados.ativa) return;
    
    let opcoes = enqueteAtualDados.opcoes || [];
    if (opcoes.length === 0) return;

    let vencedor = opcoes[0];
    let total = 0;
    let empate = false;
    
    opcoes.forEach(op => total += op.votos);

    // Calcula quem venceu
    for (let i = 1; i < opcoes.length; i++) {
        if (opcoes[i].votos > vencedor.votos) {
            vencedor = opcoes[i];
            empate = false;
        } else if (opcoes[i].votos === vencedor.votos && vencedor.votos > 0) {
            empate = true;
        }
    }

    let tituloVencedor = empate ? "Empate!" : `${vencedor.texto} venceu!`;
    let mensagemResultado = `📊 VOTAÇÃO ENCERRADA: ${enqueteAtualDados.pergunta}\n🏆 ${tituloVencedor} (Total: ${total} votos)\n`;
    
    opcoes.forEach(op => {
        mensagemResultado += `👉 ${op.texto}: ${op.votos} votos\n`;
    });

    try {
        await updateDoc(doc(db, "sistema", "enquete_atual"), { ativa: false });
        await addDoc(collection(db, "mensagens"), {
            texto: mensagemResultado.trim(),
            autor: "SISTEMA",
            foto: "https://ui-avatars.com/api/?name=S&background=c75432&color=fff",
            data_hora: serverTimestamp()
        });
    } catch (erro) {
        console.error("Erro ao encerrar enquete:", erro);
    }
}

// 4. ADMIN: Adicionar mais opções no formulário
const btnAddOpcao = document.getElementById('btn-add-opcao-enquete');
if (btnAddOpcao) {
    btnAddOpcao.addEventListener('click', () => {
        const container = document.getElementById('container-opcoes-enquete');
        if (!container) return;
        const qtd = container.querySelectorAll('.input-opcao-enquete').length + 1;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-opcao-enquete';
        input.placeholder = `Opção ${qtd}`;
        input.style.cssText = "width: 100%; padding: 10px; margin-bottom: 5px; background: #111; color: #fff; border: 1px solid var(--text-muted); border-radius: 5px;";
        
        container.appendChild(input);
        container.scrollTop = container.scrollHeight;
    });
}

// 5. ADMIN: Abrir Modal
const btnAbrirFormEnquete = document.getElementById('btn-abrir-form-enquete');
if (btnAbrirFormEnquete) {
    btnAbrirFormEnquete.addEventListener('click', () => {
        document.getElementById('modal-criar-enquete').style.display = 'flex';
    });
}

// 6. ADMIN: Disparar Enquete
const btnDispararEnquete = document.getElementById('btn-disparar-enquete');
if (btnDispararEnquete) {
    btnDispararEnquete.addEventListener('click', async () => {
        const pergunta = document.getElementById('nova-enquete-pergunta').value.trim();
        const tempoInput = document.getElementById('nova-enquete-tempo');
        const tempoMinutos = tempoInput ? parseInt(tempoInput.value) || 5 : 5;
        
        const inputsOpcoes = document.querySelectorAll('.input-opcao-enquete');
        let opcoes = [];
        
        inputsOpcoes.forEach((input) => {
            if (input.value.trim() !== "") {
                opcoes.push({ texto: input.value.trim(), votos: 0 });
            }
        });

        if (!pergunta || opcoes.length < 2) {
            alert('Preencha a pergunta e no mínimo duas opções válidas!');
            return;
        }

        const tempoEmMilissegundos = tempoMinutos * 60 * 1000;
        const dataFim = Date.now() + tempoEmMilissegundos;

        try {
            await setDoc(doc(db, "sistema", "enquete_atual"), {
                pergunta: pergunta,
                ativa: true,
                votaram: [],
                opcoes: opcoes,
                terminaEm: dataFim
            });
            
            document.getElementById('nova-enquete-pergunta').value = '';
            const container = document.getElementById('container-opcoes-enquete');
            if (container) {
                container.innerHTML = `
                    <input type="text" class="input-opcao-enquete" placeholder="Opção 1" style="width: 100%; padding: 10px; margin-bottom: 5px; background: #111; color: #fff; border: 1px solid var(--text-muted); border-radius: 5px;">
                    <input type="text" class="input-opcao-enquete" placeholder="Opção 2" style="width: 100%; padding: 10px; margin-bottom: 5px; background: #111; color: #fff; border: 1px solid var(--text-muted); border-radius: 5px;">
                `;
            }
            document.getElementById('modal-criar-enquete').style.display = 'none';
        } catch (erro) {
            alert("Erro ao criar a enquete: " + erro.message);
        }
    });
}

// 7. ADMIN: Encerrar Manualmente 
const btnEncerrarEnquete = document.getElementById('btn-encerrar-enquete');
if (btnEncerrarEnquete) {
    btnEncerrarEnquete.addEventListener('click', () => {
        if (!confirm("Encerrar votação antecipadamente e mandar resultado no chat?")) return;
        encerrarEnqueteOficial();
    });
}
