/* Jogos sociais feitos para um único celular compartilhado pelo grupo. */
(() => {
  const D = window.MONTE_DATA;

  D.games.push(
    {id:'grace',icon:'∞',category:'Criatividade',title:'Conecte com a Graça',description:'Receba um objeto e transforme-o em uma ilustração sobre a graça de Cristo.',rules:'Você recebe um objeto, pensa por 30 segundos e tem 1 minuto para conectá-lo à graça de Jesus. O grupo decide se a conexão fez sentido.',mode:'grace',accent:'lime'},
    {id:'versehunt',icon:'⌕',category:'Equipes',title:'Caça ao Versículo',description:'Duas equipes correm para encontrar a passagem indicada em Bíblias físicas.',rules:'O celular mostra uma pista. As equipes procuram em suas Bíblias e o mediador marca quem encontrou primeiro. A referência aparece depois.',mode:'versehunt',accent:'gold'},
    {id:'reveal',icon:'◫',category:'Visual',title:'Imagem Revelada',description:'Descubra a história enquanto uma ilustração bíblica vai ficando mais clara.',rules:'Mostre a tela ao grupo. A imagem perde o desfoque a cada 5 segundos. Quanto antes acertarem, mais pontos ganham.',mode:'reveal',accent:'lime'},
    {id:'mimechain',icon:'↝',category:'Festa',title:'Mímica sem Fio',description:'Uma história passa de pessoa para pessoa usando somente gestos.',rules:'Só a primeira pessoa vê a história. Ela faz a mímica para a segunda, que repete o que entendeu para a próxima. A última diz a resposta.',mode:'mimechain',accent:'orange'}
  );

  D.graceObjects = [
    'Chaveiro','Guarda-chuva','Lanterna','Espelho','Copo','Corda','Relógio','Mochila','Carregador','Semente',
    'Curativo','Borracha','Presente','Recibo','Ponte','Bússola','Garrafa','Óculos','Ímã','Sabonete',
    'Cadeado','Janela','Porta','Vela','Mapa','Âncora','Filtro','Bateria','Cobertor','Sapato',
    'Caneta','Caderno','Cola','Tesoura','Escada','Capacete','Cinto','Alarme','Calendário','Controle remoto',
    'Fone de ouvido','Câmera','Peneira','Vaso','Tijolo','Linha e agulha','Pão','Moeda','Caixa de ferramentas','Placa de trânsito'
  ];

  D.verseHunt = [
    {clue:'Encontre onde Jesus diz que é o caminho, a verdade e a vida.',ref:'João 14:6',note:'Jesus afirma que o acesso ao Pai acontece por meio dele.'},
    {clue:'Encontre o texto que apresenta o amor como paciente e bondoso.',ref:'1 Coríntios 13:4–7',note:'Paulo descreve atitudes concretas do amor.'},
    {clue:'Encontre onde Paulo fala sobre toda a armadura de Deus.',ref:'Efésios 6:10–18',note:'A passagem usa uma armadura para ensinar sobre a vida espiritual.'},
    {clue:'Encontre o versículo que diz que Deus amou o mundo de tal maneira.',ref:'João 3:16',note:'O amor de Deus é demonstrado ao entregar seu Filho.'},
    {clue:'Encontre onde está escrito que tudo posso naquele que me fortalece.',ref:'Filipenses 4:13',note:'Paulo fala sobre permanecer firme em toda circunstância.'},
    {clue:'Encontre o salmo que começa dizendo que o Senhor é o meu pastor.',ref:'Salmo 23:1',note:'O salmo apresenta o cuidado de Deus como o de um pastor.'},
    {clue:'Encontre a orientação para confiar no Senhor de todo o coração.',ref:'Provérbios 3:5–6',note:'A sabedoria bíblica convida a reconhecer Deus em todos os caminhos.'},
    {clue:'Encontre onde Jesus ensina a buscar primeiro o Reino de Deus.',ref:'Mateus 6:33',note:'Jesus ensina a colocar o Reino acima das preocupações materiais.'},
    {clue:'Encontre o versículo que afirma que Deus é amor.',ref:'1 João 4:8',note:'João relaciona conhecer a Deus com viver em amor.'},
    {clue:'Encontre onde somos chamados de luz do mundo.',ref:'Mateus 5:14–16',note:'Jesus ensina seus discípulos a deixarem suas boas obras apontarem para Deus.'},
    {clue:'Encontre o texto que diz que a resposta branda desvia o furor.',ref:'Provérbios 15:1',note:'A maneira de responder pode acalmar ou aumentar um conflito.'},
    {clue:'Encontre onde está escrito que a alegria do Senhor é a nossa força.',ref:'Neemias 8:10',note:'O povo é encorajado a celebrar e repartir enquanto ouve a Lei.'},
    {clue:'Encontre a passagem que manda lançar sobre Deus toda a ansiedade.',ref:'1 Pedro 5:7',note:'Podemos entregar nossas preocupações porque Deus cuida de nós.'},
    {clue:'Encontre onde Jesus convida os cansados e sobrecarregados a irem até ele.',ref:'Mateus 11:28–30',note:'Jesus oferece descanso e um jugo suave.'},
    {clue:'Encontre o versículo que diz que a fé vem pelo ouvir.',ref:'Romanos 10:17',note:'Paulo relaciona a fé à mensagem anunciada sobre Cristo.'},
    {clue:'Encontre onde está escrito que há tempo para todo propósito.',ref:'Eclesiastes 3:1',note:'O texto apresenta diferentes tempos e estações da vida.'},
    {clue:'Encontre a orientação para perdoar como o Senhor nos perdoou.',ref:'Colossenses 3:13',note:'O perdão recebido de Cristo se torna modelo para nossos relacionamentos.'},
    {clue:'Encontre onde aparecem amor, alegria, paz e os outros frutos do Espírito.',ref:'Gálatas 5:22–23',note:'Paulo descreve o caráter produzido pelo Espírito.'},
    {clue:'Encontre o texto que chama a Palavra de lâmpada para os pés.',ref:'Salmo 119:105',note:'A Palavra de Deus ilumina as decisões e o caminho.'},
    {clue:'Encontre onde Jesus ensina a amar os inimigos e orar por quem persegue.',ref:'Mateus 5:44',note:'O amor ensinado por Jesus alcança até quem nos trata mal.'},
    {clue:'Encontre o versículo que diz que, se alguém está em Cristo, é nova criação.',ref:'2 Coríntios 5:17',note:'Em Cristo começa uma vida nova.'},
    {clue:'Encontre onde Paulo diz para não se conformar com este mundo.',ref:'Romanos 12:2',note:'A transformação acontece pela renovação da mente.'},
    {clue:'Encontre o texto que manda fazer tudo de coração, como para o Senhor.',ref:'Colossenses 3:23',note:'O trabalho pode ser realizado como serviço ao Senhor.'},
    {clue:'Encontre onde está escrito que o justo viverá pela fé.',ref:'Habacuque 2:4',note:'A fidelidade e a confiança em Deus sustentam o justo.'},
    {clue:'Encontre o versículo que diz que onde está o tesouro também está o coração.',ref:'Mateus 6:21',note:'Nossas prioridades revelam a direção do coração.'},
    {clue:'Encontre onde somos orientados a orar sem cessar.',ref:'1 Tessalonicenses 5:17',note:'A oração deve acompanhar continuamente a vida cristã.'},
    {clue:'Encontre a passagem que ensina a ser praticante da Palavra, não apenas ouvinte.',ref:'Tiago 1:22',note:'Ouvir precisa produzir obediência.'},
    {clue:'Encontre onde está escrito que as misericórdias do Senhor se renovam a cada manhã.',ref:'Lamentações 3:22–23',note:'A fidelidade de Deus traz esperança mesmo em dias difíceis.'},
    {clue:'Encontre o texto que diz para alegrar-se com os que se alegram e chorar com os que choram.',ref:'Romanos 12:15',note:'A comunidade cristã compartilha as alegrias e as dores.'},
    {clue:'Encontre onde Jesus promete estar com seus discípulos todos os dias.',ref:'Mateus 28:20',note:'A Grande Comissão termina com a promessa da presença de Jesus.'}
  ];

  D.mimeChain = [
    {answer:'Noé construindo a arca',prompt:'Construa uma grande arca e chame os animais de dois em dois.'},
    {answer:'Davi enfrentando Golias',prompt:'Gire uma funda e enfrente um gigante muito maior que você.'},
    {answer:'Moisés abrindo o Mar Vermelho',prompt:'Levante o cajado e abra o mar para o povo atravessar.'},
    {answer:'Daniel na cova dos leões',prompt:'Ore com calma enquanto leões caminham ao seu redor.'},
    {answer:'Jonas e o grande peixe',prompt:'Fuja, enfrente uma tempestade e seja engolido por um grande peixe.'},
    {answer:'Josué e as muralhas de Jericó',prompt:'Marche, toque uma trombeta e veja uma muralha cair.'},
    {answer:'Sansão derrubando as colunas',prompt:'Empurre duas colunas com toda a força até tudo desabar.'},
    {answer:'Zaqueu subindo na árvore',prompt:'Suba numa árvore para conseguir enxergar Jesus no meio da multidão.'},
    {answer:'Jesus acalmando a tempestade',prompt:'Esteja num barco agitado e faça o vento e o mar se acalmarem.'},
    {answer:'A multiplicação dos pães e peixes',prompt:'Receba poucos pães e peixes e distribua comida para uma multidão.'},
    {answer:'O bom samaritano',prompt:'Encontre um viajante ferido, cuide dele e ajude-o a seguir viagem.'},
    {answer:'A ovelha perdida',prompt:'Procure uma ovelha por toda parte e volte carregando-a nos ombros.'},
    {answer:'Pedro andando sobre as águas',prompt:'Saia do barco, caminhe sobre a água, tenha medo e comece a afundar.'},
    {answer:'A pesca maravilhosa',prompt:'Puxe uma rede vazia e depois lute para levantar uma rede cheia de peixes.'},
    {answer:'O paralítico descendo pelo telhado',prompt:'Abra um telhado e desça cuidadosamente uma pessoa em uma maca.'},
    {answer:'Jesus lavando os pés dos discípulos',prompt:'Ajoelhe-se com uma bacia e lave os pés de várias pessoas.'},
    {answer:'José recebendo a túnica colorida',prompt:'Vista uma túnica especial enquanto seus irmãos observam.'},
    {answer:'José interpretando os sonhos do faraó',prompt:'Ouça o sonho de um rei e explique vacas gordas e vacas magras.'},
    {answer:'Elias recebendo comida dos corvos',prompt:'Espere junto a um riacho e receba pão trazido por pássaros.'},
    {answer:'Naamã mergulhando sete vezes',prompt:'Entre no rio, mergulhe sete vezes e veja sua pele restaurada.'},
    {answer:'Ester entrando diante do rei',prompt:'Vista-se como rainha, respire fundo e aproxime-se do trono.'},
    {answer:'Neemias reconstruindo o muro',prompt:'Coloque pedras num muro enquanto vigia se o perigo está chegando.'},
    {answer:'Os amigos na fornalha',prompt:'Caminhe no meio de um fogo enorme sem se queimar.'},
    {answer:'O nascimento de Jesus',prompt:'Embale um bebê numa manjedoura enquanto uma estrela brilha acima.'},
    {answer:'O batismo de Jesus',prompt:'Entre num rio, seja batizado e veja uma pomba descendo.'},
    {answer:'As bodas de Caná',prompt:'Encha grandes potes com água e depois sirva algo surpreendente.'},
    {answer:'A entrada de Jesus em Jerusalém',prompt:'Monte num jumentinho enquanto as pessoas balançam ramos.'},
    {answer:'A última ceia',prompt:'Sente-se à mesa, reparta o pão e passe um cálice aos amigos.'},
    {answer:'Pedro saindo da prisão',prompt:'Durma acorrentado, seja acordado por um anjo e atravesse portas abertas.'},
    {answer:'Paulo e Silas cantando na prisão',prompt:'Cante algemado até um terremoto abrir as portas da prisão.'}
  ];

  const imageScenes = [
    ['A Arca de Noé','Gênesis 6–9'],['Davi e Golias','1 Samuel 17'],['A abertura do Mar Vermelho','Êxodo 14'],['Daniel na cova dos leões','Daniel 6'],
    ['Jonas e o grande peixe','Jonas 1–2'],['O nascimento de Jesus','Lucas 2'],['Jesus acalma a tempestade','Marcos 4:35–41'],['A multiplicação dos pães e peixes','João 6:1–14'],
    ['A queda das muralhas de Jericó','Josué 6'],['José e sua túnica','Gênesis 37'],['Sansão derruba as colunas','Juízes 16'],['Zaqueu encontra Jesus','Lucas 19:1–10'],
    ['Os três amigos na fornalha','Daniel 3'],['O bom samaritano','Lucas 10:25–37'],['A ovelha perdida','Lucas 15:3–7'],['O túmulo vazio','Mateus 28']
  ];
  const positions = [0,33.333,66.667,100];
  D.revealImages = imageScenes.map(([answer,ref],index) => ({answer,ref,x:positions[index%4],y:positions[Math.floor(index/4)]}));
})();
