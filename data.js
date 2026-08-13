window.MONTE_DATA = {
  games: [
    {id:'who',number:'01',icon:'?',category:'Adivinhação',title:'Quem Sou Eu?',description:'Adivinhe personagens conhecidos da Bíblia com o celular na testa.',rules:'Coloque o celular na testa. Incline para baixo quando acertar e para cima para pular. Todos os tempos usam o mesmo baralho.',mode:'cards',accent:'lime',landscape:true},
    {id:'mime',number:'02',icon:'♟',category:'Adivinhação',title:'Mímica Bíblica',description:'Represente personagens e acontecimentos sem falar.',rules:'Uma pessoa vê a carta e faz a mímica. O grupo tenta adivinhar antes do tempo acabar.',mode:'cards',accent:'orange'},
    {id:'draw',number:'03',icon:'✎',category:'Criatividade',title:'Desenho Bíblico',description:'Sorteie uma palavra e desenhe no papel para a turma adivinhar.',rules:'Separe papel e caneta. O desenhista vê a carta, desenha sem escrever letras e marca quando o grupo acertar.',mode:'cards',accent:'gold'},
    {id:'verse',number:'04',icon:'“',category:'Conhecimento',title:'Complete o Versículo',description:'Escolha a palavra que completa versículos conhecidos.',rules:'Leia o trecho, escolha uma alternativa e confira a referência e a resposta completa.',mode:'quiz',accent:'cream'},
    {id:'truth',number:'05',icon:'✓',category:'Conhecimento',title:'Verdadeiro ou Falso',description:'Descubra o que é fato e o que não é nas histórias bíblicas.',rules:'Escolha verdadeiro ou falso. Cada resposta revela uma explicação curta.',mode:'quiz',accent:'lime'},
    {id:'quote',number:'06',icon:'!',category:'Conhecimento',title:'Quem Disse Isso?',description:'Descubra quem pronunciou cada frase bíblica.',rules:'Leia a frase e escolha entre quatro personagens. A referência aparece depois da resposta.',mode:'quiz',accent:'orange'},
    {id:'clues',number:'07',icon:'5',category:'Adivinhação',title:'Bíblia em 5 Pistas',description:'Descubra o personagem usando o mínimo possível de pistas.',rules:'Comece valendo 5 pontos. Revele novas pistas quando precisar; cada pista reduz um ponto.',mode:'clues',accent:'gold'},
    {id:'taboo',number:'08',icon:'×',category:'Adivinhação',title:'Palavra Proibida',description:'Explique a palavra sem usar os termos proibidos.',rules:'Faça o grupo adivinhar a palavra principal sem falar nenhuma das palavras proibidas na carta.',mode:'cards',accent:'cream'},
    {id:'battle',number:'09',icon:'⚡',category:'Equipes',title:'Batalha de Perguntas',description:'Duas equipes disputam uma sequência de perguntas bíblicas.',rules:'As equipes jogam alternadamente. Cada resposta correta vale um ponto. Vence quem somar mais.',mode:'battle',accent:'lime'},
    {id:'emoji',number:'10',icon:'☺',category:'Visual',title:'Emoji Bíblico',description:'Decifre personagens e histórias representados por emojis.',rules:'Observe os emojis, discuta com o grupo e marque quando descobrirem a resposta.',mode:'cards',accent:'orange'},
    {id:'infiltrator',number:'11',icon:'◉',category:'Festa',title:'O Infiltrado',description:'Todos recebem uma palavra, menos quem está infiltrado.',rules:'Passe o celular. Cada pessoa olha sua palavra em segredo e dá uma pista. No final, votem em quem recebeu a palavra diferente.',mode:'infiltrator',accent:'gold'}
  ],

  commonCharacters: [
    ['Jesus','Filho de Deus'],['Maria','Mãe de Jesus'],['José','Pai terreno de Jesus'],['Adão','Primeiro homem'],['Eva','Primeira mulher'],['Noé','Construiu uma arca'],['Abraão','Pai de muitas nações'],['Sara','Mãe de Isaque'],['Isaque','Filho da promessa'],['Jacó','Pai das doze tribos'],['José do Egito','Tinha uma túnica colorida'],['Moisés','Abriu o Mar Vermelho'],['Arão','Irmão de Moisés'],['Josué','Liderou o povo em Jericó'],['Sansão','Conhecido por sua força'],['Samuel','Ouviu Deus ainda menino'],['Saul','Primeiro rei de Israel'],['Davi','Derrotou Golias'],['Golias','Gigante filisteu'],['Salomão','Rei conhecido pela sabedoria'],['Elias','Profeta no monte Carmelo'],['Eliseu','Sucessor de Elias'],['Jonas','Foi engolido por um grande peixe'],['Daniel','Sobreviveu à cova dos leões'],['Ester','Rainha que protegeu seu povo'],['Rute','Companheira fiel de Noemi'],['Jó','Permaneceu fiel no sofrimento'],['João Batista','Batizou Jesus'],['Pedro','Pescador e discípulo'],['João','Discípulo amado'],['Mateus','Cobrador de impostos e discípulo'],['Tomé','Quis ver para crer'],['Paulo','Apóstolo dos gentios'],['Maria Madalena','Viu Jesus ressuscitado'],['Marta','Irmã de Maria e Lázaro'],['Lázaro','Foi ressuscitado por Jesus'],['Zaqueu','Subiu em uma árvore'],['Timóteo','Jovem discípulo de Paulo'],['Débora','Juíza de Israel'],['Gideão','Liderou apenas 300 homens']
  ],

  mime: [
    ['Construir a arca','Acontecimento'],['Abrir o Mar Vermelho','Acontecimento'],['Derrubar Golias','Acontecimento'],['Ser engolido pelo grande peixe','Acontecimento'],['Entrar na cova dos leões','Acontecimento'],['Subir numa árvore','Acontecimento'],['Tocar uma harpa','Ação'],['Pescar muitos peixes','Ação'],['Derrubar os muros de Jericó','Acontecimento'],['Carregar uma cruz','Ação'],['Procurar a ovelha perdida','Parábola'],['Multiplicar pães e peixes','Milagre'],['Andar sobre as águas','Milagre'],['Lançar uma rede','Ação'],['Receber as tábuas da Lei','Acontecimento'],['Dormir durante uma tempestade','Acontecimento'],['Lavar os pés dos discípulos','Ação'],['Plantar uma semente','Parábola'],['Perder a força ao cortar o cabelo','Acontecimento'],['Ser lançado numa fornalha','Acontecimento'],['Montar num jumentinho','Acontecimento'],['Tocar uma trombeta','Ação'],['Orar de joelhos','Ação'],['Construir uma torre','Ação']
  ],

  draw: [
    ['Arca de Noé','Desenhe no papel'],['Arco-íris','Desenhe no papel'],['Mar Vermelho','Desenhe no papel'],['Tábuas dos Dez Mandamentos','Desenhe no papel'],['Funda de Davi','Desenhe no papel'],['Coroa de rei','Desenhe no papel'],['Cova dos leões','Desenhe no papel'],['Grande peixe','Desenhe no papel'],['Torre de Babel','Desenhe no papel'],['Manjedoura','Desenhe no papel'],['Estrela de Belém','Desenhe no papel'],['Cruz','Desenhe no papel'],['Barco dos discípulos','Desenhe no papel'],['Pães e peixes','Desenhe no papel'],['Ovelha perdida','Desenhe no papel'],['Semente de mostarda','Desenhe no papel'],['Poço','Desenhe no papel'],['Cajado','Desenhe no papel'],['Trombeta','Desenhe no papel'],['Sandálias','Desenhe no papel'],['Uvas gigantes','Desenhe no papel'],['Sarça ardente','Desenhe no papel'],['Escada de Jacó','Desenhe no papel'],['Armadura de Deus','Desenhe no papel']
  ],

  taboo: [
    {word:'Moisés',forbidden:['Egito','mar','faraó','mandamentos']},{word:'Noé',forbidden:['arca','animais','dilúvio','chuva']},{word:'Davi',forbidden:['Golias','pedra','rei','harpa']},{word:'Jonas',forbidden:['peixe','Nínive','mar','fugiu']},{word:'Daniel',forbidden:['leões','cova','Babilônia','oração']},{word:'Jesus',forbidden:['Deus','cruz','Salvador','discípulos']},{word:'Sansão',forbidden:['força','cabelo','Dalila','filisteus']},{word:'José do Egito',forbidden:['túnica','sonhos','irmãos','faraó']},{word:'Pedro',forbidden:['pescador','discípulo','negou','andar']},{word:'Maria',forbidden:['Jesus','mãe','anjo','Belém']},{word:'Abraão',forbidden:['Isaque','Sara','promessa','nações']},{word:'Ester',forbidden:['rainha','rei','povo','Mardoqueu']},{word:'Paulo',forbidden:['apóstolo','cartas','Damasco','prisão']},{word:'Salomão',forbidden:['sabedoria','rei','templo','Davi']},{word:'Zaqueu',forbidden:['árvore','baixo','impostos','Jesus']},{word:'Lázaro',forbidden:['ressuscitou','túmulo','Marta','Maria']},{word:'João Batista',forbidden:['batismo','rio','Jesus','deserto']},{word:'Rute',forbidden:['Noemi','Boaz','colheita','fidelidade']}
  ],

  emoji: [
    ['👦🏻 🪨 🎯 🧔🏻','Davi e Golias'],['👨🏻 🛶 🐘 🦁 🌧️','Arca de Noé'],['👶🏻 🧺 🌊 👑','Moisés no cesto'],['👨🏻 🌊 🐋 🙏','Jonas e o grande peixe'],['👨🏻 🦁 🦁 🙏','Daniel na cova dos leões'],['👑 👩🏻 🙏 👥','Rainha Ester'],['👨🏻‍🦱 ✂️ 💪🏻','Sansão'],['⭐ 👶🏻 🐑 👑','Nascimento de Jesus'],['🍞 🐟 👥 👥','Multiplicação dos pães'],['👨🏻 🚶🏻‍♂️ 🌊','Jesus anda sobre as águas'],['🌳 👨🏻‍🦱 👀','Zaqueu na árvore'],['🎺 🧱 💥','Muralhas de Jericó'],['🔥 🌿 👣','Sarça ardente'],['👬🏻 👕 🌈 🕳️','José vendido pelos irmãos'],['🐑 🔎 🎉','Ovelha perdida'],['🪜 ☁️ 😴','Escada de Jacó'],['💰 🐖 🏠 🤗','Filho pródigo'],['⛵ 🌪️ 😴 ✋','Jesus acalma a tempestade'],['✝️ 🪦 🌅 🙌','Ressurreição de Jesus'],['👅 🔥 🌍','Pentecostes']
  ],

  quizzes: {
    truth: [
      {q:'Moisés entrou na Terra Prometida.',options:['Verdadeiro','Falso'],answer:1,explanation:'Moisés viu a terra de longe, mas Josué liderou a entrada do povo. Deuteronômio 34.'},
      {q:'Davi era pastor de ovelhas antes de ser rei.',options:['Verdadeiro','Falso'],answer:0,explanation:'Davi cuidava das ovelhas de seu pai. 1 Samuel 16.'},
      {q:'Jonas foi enviado à cidade de Nínive.',options:['Verdadeiro','Falso'],answer:0,explanation:'Deus enviou Jonas para anunciar sua mensagem em Nínive. Jonas 1.'},
      {q:'Daniel foi lançado numa fornalha de fogo.',options:['Verdadeiro','Falso'],answer:1,explanation:'Sadraque, Mesaque e Abede-Nego foram lançados na fornalha; Daniel foi à cova dos leões.'},
      {q:'Jesus nasceu em Belém.',options:['Verdadeiro','Falso'],answer:0,explanation:'Jesus nasceu em Belém da Judeia. Mateus 2 e Lucas 2.'},
      {q:'Noé levou somente um casal de cada animal na arca.',options:['Verdadeiro','Falso'],answer:1,explanation:'Gênesis 7 menciona sete pares de animais puros e um par dos animais impuros.'},
      {q:'Salomão pediu sabedoria a Deus.',options:['Verdadeiro','Falso'],answer:0,explanation:'Salomão pediu entendimento para governar o povo. 1 Reis 3.'},
      {q:'Paulo fazia parte dos doze discípulos originais.',options:['Verdadeiro','Falso'],answer:1,explanation:'Paulo tornou-se apóstolo depois da ressurreição de Jesus.'},
      {q:'Rute era nora de Noemi.',options:['Verdadeiro','Falso'],answer:0,explanation:'Rute permaneceu com Noemi depois de ficar viúva. Rute 1.'},
      {q:'Pedro negou conhecer Jesus três vezes.',options:['Verdadeiro','Falso'],answer:0,explanation:'A negação aconteceu antes do galo cantar. Mateus 26.'},
      {q:'Ester era irmã de Mardoqueu.',options:['Verdadeiro','Falso'],answer:1,explanation:'Ester era prima de Mardoqueu e foi criada por ele. Ester 2.'},
      {q:'Jesus transformou água em vinho.',options:['Verdadeiro','Falso'],answer:0,explanation:'Esse sinal aconteceu em um casamento em Caná. João 2.'}
    ],
    quote: [
      {q:'“Eis-me aqui, envia-me a mim.”',options:['Isaías','Moisés','Samuel','Pedro'],answer:0,explanation:'Isaías respondeu ao chamado de Deus. Isaías 6:8.'},
      {q:'“O teu povo é o meu povo, o teu Deus é o meu Deus.”',options:['Ester','Rute','Sara','Maria'],answer:1,explanation:'Rute disse isso a Noemi. Rute 1:16.'},
      {q:'“Eu e a minha casa serviremos ao Senhor.”',options:['Josué','Davi','Abraão','Paulo'],answer:0,explanation:'Declaração de Josué ao povo. Josué 24:15.'},
      {q:'“Tu és o Cristo, o Filho do Deus vivo.”',options:['João','Pedro','Tomé','Mateus'],answer:1,explanation:'Pedro respondeu a Jesus. Mateus 16:16.'},
      {q:'“Fala, porque o teu servo ouve.”',options:['Elias','Samuel','Saul','Salomão'],answer:1,explanation:'Samuel respondeu ao chamado do Senhor. 1 Samuel 3:10.'},
      {q:'“Para mim o viver é Cristo.”',options:['Pedro','Paulo','João','Tiago'],answer:1,explanation:'Paulo escreveu isso aos filipenses. Filipenses 1:21.'},
      {q:'“Sou eu o guarda do meu irmão?”',options:['Caim','Abel','Esaú','José'],answer:0,explanation:'Caim respondeu a Deus depois da morte de Abel. Gênesis 4:9.'},
      {q:'“Meu Senhor e meu Deus!”',options:['Pedro','João','Tomé','Filipe'],answer:2,explanation:'Tomé declarou isso ao ver Jesus ressuscitado. João 20:28.'},
      {q:'“Dá-me sabedoria e conhecimento.”',options:['Davi','Salomão','Samuel','Daniel'],answer:1,explanation:'Salomão fez esse pedido a Deus. 2 Crônicas 1:10.'},
      {q:'“Arrependo-me no pó e na cinza.”',options:['Jó','Jonas','Jeremias','Elias'],answer:0,explanation:'Jó respondeu ao Senhor. Jó 42:6.'}
    ],
    verse: [
      {q:'“O Senhor é o meu ___; nada me faltará.”',options:['pastor','escudo','caminho','amigo'],answer:0,explanation:'“O Senhor é o meu pastor; nada me faltará.” Salmo 23:1.'},
      {q:'“Tudo posso naquele que me ___.”',options:['guarda','fortalece','ensina','perdoa'],answer:1,explanation:'“Tudo posso naquele que me fortalece.” Filipenses 4:13.'},
      {q:'“Lâmpada para os meus pés é tua ___.”',options:['luz','graça','palavra','verdade'],answer:2,explanation:'“Lâmpada para os meus pés é tua palavra.” Salmo 119:105.'},
      {q:'“O choro pode durar uma noite, mas a ___ vem pela manhã.”',options:['paz','alegria','força','graça'],answer:1,explanation:'Salmo 30:5 contrasta o choro com a alegria da manhã.'},
      {q:'“Bem-aventurados os ___, porque herdarão a terra.”',options:['fortes','mansos','sábios','justos'],answer:1,explanation:'Jesus ensinou sobre os mansos. Mateus 5:5.'},
      {q:'“Conhecereis a verdade, e a verdade vos ___.”',options:['guiará','ensinará','libertará','salvará'],answer:2,explanation:'Palavras de Jesus em João 8:32.'},
      {q:'“A fé vem pelo ouvir, e o ouvir pela palavra de ___.”',options:['Deus','Cristo','vida','verdade'],answer:1,explanation:'Romanos 10:17 relaciona fé e a palavra de Cristo.'},
      {q:'“O amor é paciente, o amor é ___.”',options:['forte','eterno','bondoso','perfeito'],answer:2,explanation:'Descrição do amor em 1 Coríntios 13:4.'},
      {q:'“No princípio, criou Deus os céus e a ___.”',options:['luz','terra','vida','água'],answer:1,explanation:'Primeiro versículo da Bíblia. Gênesis 1:1.'},
      {q:'“Porque Deus amou o mundo de tal ___.”',options:['força','modo','maneira','amor'],answer:2,explanation:'Início de João 3:16.'}
    ]
  },

  clues: [
    {answer:'Daniel',clues:['Servi em um reino estrangeiro.','Meus inimigos observaram minha rotina.','Continuei orando mesmo quando foi proibido.','Fui lançado em um lugar perigoso.','Deus fechou a boca dos leões.']},
    {answer:'José do Egito',clues:['Tive sonhos desde jovem.','Meus irmãos tiveram ciúmes de mim.','Fui vendido e levado para outro país.','Interpretei os sonhos de um governante.','Recebi uma túnica colorida.']},
    {answer:'Ester',clues:['Fui criada por um parente.','Vivi em um reino estrangeiro.','Arrisquei minha vida diante do rei.','Ajudei a impedir um plano contra meu povo.','Tornei-me rainha.']},
    {answer:'Pedro',clues:['Meu trabalho envolvia barcos.','Fui chamado para seguir Jesus.','Andei por alguns instantes sobre a água.','Neguei Jesus três vezes.','Era pescador.']},
    {answer:'Moisés',clues:['Fui criado num palácio.','Enfrentei um poderoso governante.','Conduzi um povo pelo deserto.','Recebi tábuas em uma montanha.','Deus abriu o Mar Vermelho por meu intermédio.']},
    {answer:'Davi',clues:['Comecei cuidando de animais.','Tocava um instrumento.','Fui escolhido para ser rei.','Escrevi muitos salmos.','Derrotei um gigante com uma pedra.']},
    {answer:'Jonas',clues:['Recebi uma missão e tentei fugir.','Entrei num barco.','Uma tempestade ameaçou a viagem.','Fui lançado no mar.','Passei três dias dentro de um grande peixe.']},
    {answer:'Noé',clues:['Vivi em uma geração muito corrompida.','Recebi instruções detalhadas de Deus.','Trabalhei durante muito tempo numa construção.','Minha família foi preservada.','Levei animais numa arca.']},
    {answer:'Paulo',clues:['Eu perseguia os seguidores de Jesus.','Uma luz mudou minha viagem.','Escrevi cartas às igrejas.','Fui preso por anunciar o evangelho.','Antes era conhecido como Saulo.']},
    {answer:'Rute',clues:['Fiquei viúva.','Escolhi permanecer com minha sogra.','Viajei para Belém.','Recolhi espigas num campo.','Casei-me com Boaz.']}
  ],

  infiltrator: [
    ['Moisés','Josué'],['Davi','Salomão'],['Pedro','Paulo'],['Noé','Abraão'],['Maria','Marta'],['Daniel','José do Egito'],['Ester','Rute'],['Jonas','Noé'],['Sansão','Golias'],['João Batista','Elias'],['Belém','Jerusalém'],['Arca','Tabernáculo'],['Leão','Grande peixe'],['Maná','Pães e peixes'],['Mar Vermelho','Rio Jordão'],['Harpa','Trombeta']
  ]
};
