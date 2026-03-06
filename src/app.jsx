import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════
   CONSTANTS & PALETTE
   ════════════════════════════════════════════ */
const C = {
  bg: "#0B1120", sidebar: "#0f172a", sidebarHover: "#1e293b",
  accent: "#818cf8", accentBright: "#a5b4fc", accentDim: "#4f46e5",
  surface: "#f8fafc", paper: "#ffffff",
  text: "#1e293b", muted: "#64748b", light: "#94a3b8",
  border: "#e2e8f0", borderDark: "#334155",
  green: "#34d399", greenDim: "#065f46",
  warn: "#fbbf24", warnBg: "#fffbeb",
  red: "#f87171",
};

/* ════════════════════════════════════════════
   WIZARD DECISION TREE
   ════════════════════════════════════════════ */
const WIZARD = [
  { id:"start", q:"Qual é a sua necessidade principal?", sub:"Selecione a opção que melhor descreve sua situação atual.", opts:[
    { label:"Preciso registrar atendimentos", icon:"📋", desc:"Prontuário ou registro de sessões e procedimentos", next:"reg" },
    { label:"Preciso emitir um documento solicitado", icon:"📝", desc:"Declaração, atestado, relatório, laudo ou parecer", next:"doc" },
    { label:"Preciso de um termo ou formulário auxiliar", icon:"📑", desc:"Termos, encaminhamentos e requerimentos", next:"aux" },
  ]},
  { id:"reg", q:"Como é o atendimento que você realiza?", sub:"Isso determina o tipo de registro mais adequado.", opts:[
    { label:"Atendimento individual", icon:"👤", desc:"Psicoterapia, avaliação ou acompanhamento individual", result:"prontuario" },
    { label:"Equipe multiprofissional", icon:"👥", desc:"Trabalho conjunto com profissionais de outras áreas", result:"prontuario_multi" },
  ]},
  { id:"doc", q:"O documento é resultado de avaliação psicológica formal?", sub:"Avaliação com uso sistemático de métodos, técnicas e instrumentos reconhecidos (Res. 31/2022).", opts:[
    { label:"Sim, é resultado de avaliação", icon:"🔍", desc:"Utilizei testes, escalas ou procedimentos formais de avaliação", next:"doc_av" },
    { label:"Não, é sobre intervenção ou acompanhamento", icon:"💬", desc:"Psicoterapia, acolhimento, visita domiciliar, estudo de caso", next:"doc_int" },
    { label:"É uma consulta técnica ou análise de documento", icon:"📊", desc:"Analisar documento de outro profissional ou responder questão teórica", result:"parecer" },
  ]},
  { id:"doc_av", q:"Qual nível de detalhamento é necessário?", sub:"A escolha entre atestado e laudo depende da profundidade da comunicação.", opts:[
    { label:"Comunicação sintética", icon:"✅", desc:"Apto/inapto, afastamento, justificativa de falta — sem detalhar procedimentos", result:"atestado" },
    { label:"Narrativa detalhada com análise", icon:"📖", desc:"Procedimentos, interpretação de dados, fundamentação e conclusão diagnóstica", result:"laudo" },
  ]},
  { id:"doc_int", q:"O que você precisa comunicar?", sub:"Cada situação exige um tipo diferente de documento.", opts:[
    { label:"Dados objetivos e pontuais", icon:"📌", desc:"Comparecimento, dias, horários — sem juízo clínico", result:"declaracao" },
    { label:"Atuação profissional detalhada", icon:"📄", desc:"Encaminhamento, estudo de caso, subsídio técnico", next:"doc_rel" },
  ]},
  { id:"doc_rel", q:"A atuação foi individual ou em equipe?", sub:"Isso determina se será relatório psicológico ou multiprofissional.", opts:[
    { label:"Atuação individual", icon:"👤", desc:"Somente eu realizei o atendimento ou acompanhamento", result:"relatorio" },
    { label:"Em equipe multiprofissional", icon:"👥", desc:"Trabalho conjunto com profissionais de outras áreas", result:"relatorio_multi" },
  ]},
  { id:"aux", q:"Qual situação se aplica?", sub:"Selecione o termo ou formulário adequado.", opts:[
    { label:"Informar usuário sobre serviço-escola", icon:"🏫", desc:"Ciência da natureza educacional e assistencial", result:"termo_ciencia" },
    { label:"Encaminhar a outro serviço", icon:"↗️", desc:"Indisponibilidade de vaga ou necessidade especializada", result:"encaminhamento" },
    { label:"Usuário solicita documento", icon:"📋", desc:"Requerimento formal de prontuário, relatório etc.", result:"requerimento" },
    { label:"Autorizar atendimento de menor", icon:"👶", desc:"Criança ou adolescente (menor de 18 anos)", result:"termo_autorizacao" },
    { label:"Comprovar entrega de documento", icon:"✋", desc:"Protocolar recebimento após devolutiva", result:"termo_entrega" },
  ]},
];

/* ════════════════════════════════════════════
   DOCUMENT DEFINITIONS
   ════════════════════════════════════════════ */
const CATS = [
  { id:0, label:"Documentos Psicológicos", sub:"Resolução CFP nº 06/2019" },
  { id:1, label:"Registros Obrigatórios", sub:"Resolução CFP nº 01/2009" },
  { id:2, label:"Documentos Auxiliares", sub:"Apêndices do Manual" },
];

const DOCS = [
  { id:"declaracao", title:"Declaração", cat:0, icon:"📄",
    desc:"Informações objetivas sobre prestação de serviço",
    note:{ uso:"Registrar comparecimento, acompanhamento em realização, dias e horários.", quem:"Pessoa atendida, acompanhante, responsável legal, instituições (empregador, escola).", veda:"É vedado informar sintomas, situações ou estados psicológicos.", base:"Res. CFP nº 06/2019, Art. 9º" },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"Nome da instituição (se aplicável)" },
      { id:"finalidade", label:"Finalidade específica", type:"text", ph:"Ex: comprovação de comparecimento junto à Empresa X" },
      { id:"nome", label:"Nome completo da pessoa", type:"text", ph:"Nome completo ou nome social" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"tipo", label:"Tipo de declaração", type:"select", opts:["Comparecimento a atendimento","Acompanhamento em realização","Acompanhante de paciente"] },
      { id:"dataAtend", label:"Data do atendimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"horario", label:"Horário", type:"text", ph:"Ex: das 16h às 17h" },
      { id:"servico", label:"Nome do serviço/clínica", type:"text", ph:"Serviço de Psicologia Aplicada" },
      { id:"frequencia", label:"Frequência (se acompanhamento)", type:"text", ph:"Ex: semanal, às quartas-feiras" },
      { id:"previsao", label:"Previsão de encerramento", type:"text", ph:"Ex: 26/08/2025 ou sem previsão definida" },
      { id:"nomePaciente", label:"Nome do paciente (se acompanhante)", type:"text", ph:"Nome completo do paciente acompanhado" },
      { id:"psiNome", label:"Nome da Psicóloga", type:"text", ph:"Nome completo" },
      { id:"psiCRP", label:"CRP", type:"text", ph:"CRP-XX/XXXXX" },
      { id:"local", label:"Local e data", type:"text", ph:"Ex: Natal, 31 de maio de 2025" },
    ]
  },
  { id:"atestado", title:"Atestado Psicológico", cat:0, icon:"📋",
    desc:"Conclusão técnica resultante de avaliação psicológica",
    note:{ uso:"Justificar faltas/impedimentos, atestar aptidão/inaptidão, solicitar afastamento/dispensa. Obrigatório em avaliação compulsória.", quem:"Pessoa atendida, responsável legal, empregador, órgãos públicos, Poder Judiciário.", veda:"Emitir sem avaliação psicológica (Res. 31/2022). Uso do CID é facultativo, salvo em processos legais/trabalhistas (requer autorização escrita).", base:"Res. CFP nº 06/2019, Art. 10 | Trânsito: Res. 01/2019 | Arma: Res. 01/2022 | Concurso: Res. 08/2025" },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"(se aplicável)" },
      { id:"finalidade", label:"Finalidade", type:"text", ph:"Ex: comprovação junto ao trabalho" },
      { id:"nome", label:"Nome da pessoa atendida", type:"text", ph:"Nome completo ou nome social" },
      { id:"idade", label:"Idade", type:"text", ph:"Ex: 35 anos" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"conclusao", label:"Conclusão técnica", type:"textarea", ph:"Descreva a situação, estado ou funcionamento psicológico. Ex: sintomas compatíveis com CID-10 F32.1" },
      { id:"recomendacao", label:"Recomendação", type:"textarea", ph:"Ex: afastamento de atividades laborais por 7 dias para acompanhamento" },
      { id:"validade", label:"Validade", type:"text", ph:"Prazo conforme normatização vigente" },
      { id:"psiNome", label:"Nome da Psicóloga", type:"text", ph:"Nome completo" },
      { id:"psiCRP", label:"CRP", type:"text", ph:"CRP-XX/XXXXX" },
      { id:"local", label:"Local e data", type:"text", ph:"Ex: São Paulo, 10 de junho de 2025" },
    ]
  },
  { id:"relatorio", title:"Relatório Psicológico", cat:0, icon:"📑",
    desc:"Comunicação da atuação profissional — informativo, não diagnóstico",
    note:{ uso:"Encaminhamentos, estudos de caso, visitas domiciliares, ampliação de sessões (planos de saúde), subsídio a processos.", quem:"Pessoa atendida, responsável legal, instituições, Poder Judiciário, planos de saúde.", veda:"Não é descrição literal das sessões. Caráter informativo, não diagnóstico. Restringir-se à pessoa efetivamente atendida.", base:"Res. CFP nº 06/2019, Art. 11 — Devolutiva obrigatória." },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"(se aplicável)" },
      { id:"subtitulo", label:"Subtítulo", type:"text", ph:"Ex: Relatório de Acompanhamento Psicológico" },
      { id:"nome", label:"Nome da pessoa/instituição atendida", type:"text", ph:"Nome completo ou nome social" },
      { id:"dataNasc", label:"Data de nascimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"idade", label:"Idade", type:"text", ph:"XX anos" },
      { id:"doc", label:"Documento", type:"text", ph:"CPF ou RG nº" },
      { id:"responsavel", label:"Responsável legal (se aplicável)", type:"text", ph:"Nome completo" },
      { id:"outrasInfo", label:"Outras informações", type:"text", ph:"Escolaridade, profissão, estado civil" },
      { id:"solicitante", label:"Solicitante", type:"text", ph:"Quem solicitou: Poder Judiciário, empresa, o próprio usuário..." },
      { id:"finalidade", label:"Finalidade", type:"text", ph:"Razão ou motivo do pedido" },
      { id:"psiNome", label:"Autora (Psicóloga)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
      { id:"demanda", label:"Descrição da Demanda", type:"textarea", ph:"O que motivou a busca, quem forneceu as informações, contexto institucional..." },
      { id:"procedimentos", label:"Procedimentos", type:"textarea", ph:"Referencial teórico-metodológico, técnicas, pessoas ouvidas, nº de encontros, duração..." },
      { id:"analise", label:"Análise", type:"textarea", ph:"Apresentação descritiva, narrativa e analítica. Interpretação dos dados, fundamentação teórica..." },
      { id:"conclusao", label:"Conclusão", type:"textarea", ph:"Encaminhamento, orientação, sugestão de continuidade. Retomar a finalidade..." },
      { id:"validade", label:"Validade", type:"text", ph:"Indicar prazo de validade" },
      { id:"referencias", label:"Referências (facultativas)", type:"textarea", ph:"Referências bibliográficas em ABNT ou APA" },
      { id:"local", label:"Local e data", type:"text", ph:"Cidade, DD de mês de AAAA" },
    ]
  },
  { id:"relatorio_multi", title:"Relatório Multiprofissional", cat:0, icon:"👥",
    desc:"Atuação em equipe multiprofissional/interdisciplinar",
    note:{ uso:"Comunicar atuação conjunta — assistência social, hospitalar, escolar, clínica.", quem:"Instituições, equipes, Poder Judiciário, responsáveis legais.", veda:"Procedimentos e Análise devem ter redação independente por profissional. Práticas privativas da Psicologia devem ser resguardadas.", base:"Res. CFP nº 06/2019, Art. 11" },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"Nome da instituição" },
      { id:"subtitulo", label:"Subtítulo", type:"text", ph:"Ex: Relatório de Acompanhamento Multidisciplinar" },
      { id:"nome", label:"Pessoa/instituição atendida", type:"text", ph:"Nome completo" },
      { id:"dataNasc", label:"Data de nascimento / Idade", type:"text", ph:"DD/MM/AAAA — XX anos" },
      { id:"doc", label:"CPF/RG", type:"text", ph:"Documento de identificação" },
      { id:"solicitante", label:"Solicitante", type:"text", ph:"Quem solicitou" },
      { id:"finalidade", label:"Finalidade", type:"text", ph:"Razão do pedido" },
      { id:"autores", label:"Autores (todos os profissionais)", type:"textarea", ph:"Nome — CRP/Conselho nº\nNome — Conselho/Registro nº" },
      { id:"demanda", label:"Descrição da Demanda", type:"textarea", ph:"Informações conjuntas sobre o que motivou o trabalho..." },
      { id:"procPsi", label:"Procedimentos da Psicologia", type:"textarea", ph:"Descrição dos procedimentos privativos da Psicologia, separadamente..." },
      { id:"procOutro", label:"Procedimentos das demais áreas", type:"textarea", ph:"Procedimentos dos outros profissionais envolvidos..." },
      { id:"analisePsi", label:"Análise da Psicologia", type:"textarea", ph:"Análise específica da psicóloga, com fundamentação..." },
      { id:"analiseOutro", label:"Análise das demais áreas", type:"textarea", ph:"Análise dos outros profissionais..." },
      { id:"conclusao", label:"Conclusão (pode ser conjunta)", type:"textarea", ph:"Encaminhamento, orientação, validade temporal..." },
      { id:"validade", label:"Validade", type:"text", ph:"Indicar prazo" },
      { id:"referencias", label:"Referências (facultativas)", type:"textarea", ph:"ABNT ou APA" },
      { id:"local", label:"Local e data", type:"text", ph:"Cidade, data" },
      { id:"psiNome", label:"Psicóloga (nome e CRP)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
    ]
  },
  { id:"laudo", title:"Laudo Psicológico", cat:0, icon:"🔍",
    desc:"Resultado de avaliação psicológica — subsidia decisões",
    note:{ uso:"Exclusivamente como resultado de avaliação psicológica. Entrega obrigatória ao final, independente de solicitação.", quem:"Pessoa atendida, Poder Judiciário, instituições, responsáveis legais.", veda:"Emitir sem avaliação com instrumentos reconhecidos (SATEPSI/Res. 31/2022). Referências são obrigatórias. Devolutiva obrigatória.", base:"Res. CFP nº 06/2019, Art. 12–13 | CRPs podem solicitar fundamentação em até 5 anos." },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"(se aplicável)" },
      { id:"subtitulo", label:"Subtítulo", type:"text", ph:"Ex: Laudo de Avaliação Neuropsicológica" },
      { id:"nome", label:"Pessoa/instituição atendida", type:"text", ph:"Nome completo ou nome social" },
      { id:"dataNasc", label:"Data de nascimento / Idade", type:"text", ph:"DD/MM/AAAA — XX anos" },
      { id:"doc", label:"CPF/RG", type:"text", ph:"Documento" },
      { id:"responsavel", label:"Responsável legal", type:"text", ph:"(se aplicável)" },
      { id:"outrasInfo", label:"Outras informações", type:"text", ph:"Escolaridade, profissão" },
      { id:"solicitante", label:"Solicitante", type:"text", ph:"Poder Judiciário / empresa / usuário / outro" },
      { id:"finalidade", label:"Finalidade", type:"text", ph:"Razão ou motivo" },
      { id:"psiNome", label:"Autora (Psicóloga — CRP)", type:"text", ph:"Nome completo — CRP-XX/XXXXX" },
      { id:"demanda", label:"Descrição da Demanda", type:"textarea", ph:"O que motivou, quem forneceu informações, demandas..." },
      { id:"procedimentos", label:"Procedimentos", type:"textarea", ph:"Raciocínio técnico-científico, instrumentos (SATEPSI), referencial teórico, pessoas ouvidas, nº encontros, duração. Conforme Res. 31/2022." },
      { id:"analise", label:"Análise", type:"textarea", ph:"Exposição descritiva, metódica e objetiva. Interpretação dos dados, raciocínio fundamentado, natureza dinâmica e não cristalizada..." },
      { id:"conclusao", label:"Conclusão", type:"textarea", ph:"Diagnóstico, prognóstico, hipótese diagnóstica, evolução, orientação, projeto terapêutico, encaminhamentos..." },
      { id:"validade", label:"Validade", type:"text", ph:"Conforme normatização vigente" },
      { id:"referencias", label:"Referências (OBRIGATÓRIAS)", type:"textarea", ph:"Referências bibliográficas — ABNT ou APA" },
      { id:"local", label:"Local e data", type:"text", ph:"Cidade, DD de mês de AAAA" },
    ]
  },
  { id:"parecer", title:"Parecer Psicológico", cat:0, icon:"📊",
    desc:"Análise técnica — responde consulta ou analisa documento",
    note:{ uso:"Responder consulta técnica, analisar documentos questionados, emitir posicionamento fundamentado.", quem:"Poder Judiciário, partes processuais, instituições, profissionais.", veda:"Não resulta de avaliação/intervenção direta. Exige conhecimento específico comprovado. Referências obrigatórias.", base:"Res. CFP nº 06/2019, Art. 14" },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"(se aplicável)" },
      { id:"subtitulo", label:"Subtítulo", type:"text", ph:"Ex: Parecer sobre Laudo Psicológico / Validade de Instrumento" },
      { id:"objeto", label:"Pessoa/instituição objeto do parecer", type:"text", ph:"Nome" },
      { id:"solicitante", label:"Solicitante", type:"text", ph:"Poder Judiciário, parte processual, empresa..." },
      { id:"finalidade", label:"Finalidade", type:"text", ph:"Qual questão-problema deve ser respondida" },
      { id:"psiNome", label:"Autora (Psicóloga — CRP)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
      { id:"titulacao", label:"Titulação comprobatória", type:"text", ph:"Especialização, Mestrado, Doutorado..." },
      { id:"demanda", label:"Descrição da Demanda", type:"textarea", ph:"Informações da consulta, finalidades, documento analisado (título, autora, data)..." },
      { id:"analise", label:"Análise", type:"textarea", ph:"Discussão minuciosa com fundamentos éticos, técnicos e conceituais. Normativas vigentes. Contestações ou ratificações fundamentadas..." },
      { id:"conclusao", label:"Conclusão", type:"textarea", ph:"Posicionamento indicativo ou conclusivo sobre a questão-problema..." },
      { id:"referencias", label:"Referências (OBRIGATÓRIAS)", type:"textarea", ph:"ABNT ou APA" },
      { id:"local", label:"Local e data", type:"text", ph:"Cidade, DD de mês de AAAA" },
    ]
  },
  { id:"prontuario", title:"Prontuário Psicológico", cat:1, icon:"📓",
    desc:"Registro prioritário de atendimento — dever da psicóloga, direito do usuário",
    note:{ uso:"Obrigatório em toda prestação de serviço. Prioritário em saúde e assistência.", quem:"Acesso: usuário/beneficiário, Sistema Conselhos. Guarda: 5 anos (geral) ou 20 anos (saúde).", veda:"Transcrição literal NÃO é evolução. Hipóteses diagnósticas não compartilhadas → Registro Documental.", base:"Res. CFP nº 01/2009 (atualizada 05/2010) | Lei 13.787/2018" },
    fields:[
      { id:"nome", label:"Nome completo", type:"text", ph:"Nome completo ou nome social" },
      { id:"dataNasc", label:"Data de nascimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"responsavel", label:"Responsável legal", type:"text", ph:"(para crianças/adolescentes)" },
      { id:"contato", label:"Contato", type:"text", ph:"Telefone e/ou e-mail" },
      { id:"emergencia", label:"Contato de emergência", type:"text", ph:"Nome e telefone" },
      { id:"outrasInfo", label:"Outras informações", type:"text", ph:"Gênero, escolaridade, profissão, estado civil" },
      { id:"demanda", label:"Avaliação da Demanda e Plano de Trabalho", type:"textarea", ph:"Razões da busca, modalidade de assistência, objetivos, frequência, modalidade presencial/remota, prazo..." },
      { id:"evolucao1", label:"Evolução 1 — Data e registro", type:"textarea", ph:"[Data] [Horário]\nRegistro do atendimento/trabalho realizado e procedimentos técnico-científicos" },
      { id:"evolucao2", label:"Evolução 2 — Data e registro", type:"textarea", ph:"[Data] [Horário]\nRegistro do atendimento..." },
      { id:"evolucao3", label:"Evolução 3 — Data e registro", type:"textarea", ph:"[Data] [Horário]\nRegistro do atendimento..." },
      { id:"encerramento", label:"Encaminhamento ou Encerramento", type:"textarea", ph:"Como o trabalho foi concluído. Intercorrências. Encaminhamentos com justificativa." },
      { id:"psiNome", label:"Psicóloga (nome e CRP)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
    ]
  },
  { id:"prontuario_multi", title:"Prontuário Multidisciplinar", cat:1, icon:"👥",
    desc:"Registro compartilhado em equipe multiprofissional",
    note:{ uso:"Em serviços multiprofissionais — prontuário único compartilhado.", quem:"Equipe multiprofissional, usuário/beneficiário, Sistema Conselhos.", veda:"Registrar apenas informações necessárias ao trabalho. Preservar sigilo.", base:"Res. CFP nº 01/2009, Art. 4º" },
    fields:[
      { id:"nome", label:"Nome", type:"text", ph:"Nome completo ou nome social" },
      { id:"dataNasc", label:"Data de nascimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"demanda", label:"Avaliação da demanda e plano de trabalho", type:"textarea", ph:"Razões, objetivos, modalidade..." },
      { id:"evolucao1", label:"Evolução 1", type:"textarea", ph:"[Data] — Registro do atendimento — [Profissional e carimbo]" },
      { id:"evolucao2", label:"Evolução 2", type:"textarea", ph:"[Data] — Registro do atendimento — [Profissional e carimbo]" },
      { id:"encerramento", label:"Encaminhamento/Encerramento", type:"textarea", ph:"Informar conclusão, intercorrências e encaminhamentos." },
    ]
  },
  { id:"termo_ciencia", title:"Termo de Ciência", cat:2, icon:"🏫",
    desc:"Informar usuário sobre serviço-escola",
    note:{ uso:"Início do atendimento em serviço-escola.", quem:"Usuário/beneficiário do serviço-escola.", veda:"—", base:"Res. CFP nº 05/2025, Res. CNE/CES nº 01/2023" },
    fields:[
      { id:"timbre", label:"Timbre da Instituição de Ensino", type:"text", ph:"Nome da IES" },
      { id:"duracao", label:"Duração dos atendimentos", type:"text", ph:"Ex: um a dois semestres acadêmicos" },
      { id:"maxFaltas", label:"Máximo de faltas consecutivas", type:"text", ph:"Ex: 3 (três)" },
      { id:"nomeUsuario", label:"Nome do(a) Usuário(a)", type:"text", ph:"Nome completo" },
      { id:"local", label:"Cidade e data", type:"text", ph:"Cidade, DD/MM/AAAA" },
    ]
  },
  { id:"encaminhamento", title:"Formulário de Encaminhamento", cat:2, icon:"↗️",
    desc:"Encaminhar usuário para outro serviço",
    note:{ uso:"Indisponibilidade de vaga ou necessidade de atendimento especializado.", quem:"Psicóloga encaminha o usuário.", veda:"—", base:"Instrumento auxiliar recomendado pelo Manual CFP 2025." },
    fields:[
      { id:"timbre", label:"Timbre da Instituição", type:"text", ph:"Nome" },
      { id:"origem", label:"Instituição de origem", type:"text", ph:"Nome da instituição" },
      { id:"motivo", label:"Motivo do encaminhamento", type:"text", ph:"Indisponibilidade de vagas / serviço especializado" },
      { id:"destino", label:"Serviço de destino", type:"text", ph:"Nome completo do serviço" },
      { id:"endDest", label:"Endereço do destino", type:"text", ph:"Endereço completo" },
      { id:"telDest", label:"Telefone do destino", type:"text", ph:"(XX) XXXX-XXXX" },
      { id:"nomeUsuario", label:"Nome do usuário", type:"text", ph:"Nome completo" },
      { id:"responsavel", label:"Responsável (se aplicável)", type:"text", ph:"Nome" },
      { id:"dataNasc", label:"Data de nascimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"telUsuario", label:"Telefone do usuário", type:"text", ph:"(XX) XXXXX-XXXX" },
      { id:"psiNome", label:"Psicóloga", type:"text", ph:"Nome — CRP" },
      { id:"local", label:"Cidade e data", type:"text", ph:"Cidade, DD/MM/AAAA" },
    ]
  },
  { id:"requerimento", title:"Requerimento de Documento", cat:2, icon:"📋",
    desc:"Solicitação formal de documento pelo usuário",
    note:{ uso:"Quando o usuário deseja solicitar formalmente um documento.", quem:"Usuário/beneficiário.", veda:"—", base:"Prazo: até 30 dias. Para prontuário, finalidade não é obrigatória." },
    fields:[
      { id:"timbre", label:"Timbre da Instituição/Serviço", type:"text", ph:"Nome" },
      { id:"nomeReq", label:"Nome do requerente", type:"text", ph:"Nome completo" },
      { id:"rg", label:"RG", type:"text", ph:"Nº do RG" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"descDoc", label:"Documento solicitado", type:"textarea", ph:"Descreva o documento: cópia do prontuário, relatório do período X..." },
      { id:"finalidade", label:"Finalidade (opcional p/ prontuário)", type:"text", ph:"Para que será utilizado" },
      { id:"situacao", label:"Situação atual", type:"select", opts:["Está em atendimento","Não está em atendimento"] },
      { id:"dadosAux", label:"Dados auxiliares (se não em atendimento)", type:"textarea", ph:"Período, terapeuta, modalidade..." },
      { id:"telefone", label:"Telefone", type:"text", ph:"(XX) XXXXX-XXXX" },
      { id:"email", label:"E-mail", type:"text", ph:"email@dominio.com.br" },
      { id:"local", label:"Cidade e data", type:"text", ph:"Cidade, DD/MM/AAAA" },
    ]
  },
  { id:"termo_autorizacao", title:"Termo de Autorização", cat:2, icon:"👶",
    desc:"Autorização para atendimento de crianças/adolescentes",
    note:{ uso:"Obrigatório antes de iniciar psicoterapia de menores de 18 anos.", quem:"Responsável legal assina.", veda:"—", base:"Res. CFP nº 13/2022, Anexo I" },
    fields:[
      { id:"nomeResp", label:"Nome do responsável legal", type:"text", ph:"Nome completo" },
      { id:"dataNascResp", label:"Data de nascimento do responsável", type:"text", ph:"DD/MM/AAAA" },
      { id:"docResp", label:"Documento do responsável", type:"text", ph:"RG ou CPF nº" },
      { id:"enderecoResp", label:"Endereço", type:"text", ph:"Endereço completo" },
      { id:"nomeCrianca", label:"Nome da criança/adolescente", type:"text", ph:"Nome completo" },
      { id:"dataNascCrianca", label:"Data de nascimento", type:"text", ph:"DD/MM/AAAA" },
      { id:"docCrianca", label:"Documento da criança", type:"text", ph:"RG nº" },
      { id:"psiNome", label:"Psicóloga (nome e CRP)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
      { id:"local", label:"Cidade e data", type:"text", ph:"Cidade, DD/MM/AAAA" },
    ]
  },
  { id:"termo_entrega", title:"Termo de Entrega", cat:2, icon:"✋",
    desc:"Comprovar entrega de documento com devolutiva",
    note:{ uso:"Ao entregar relatório, laudo ou outro documento psicológico.", quem:"Beneficiário ou responsável legal.", veda:"—", base:"Res. CFP nº 06/2019 — devolutiva obrigatória para relatórios e laudos." },
    fields:[
      { id:"nomeUsuario", label:"Nome do usuário/responsável", type:"text", ph:"Nome completo" },
      { id:"cpf", label:"CPF", type:"text", ph:"000.000.000-00" },
      { id:"tipoDoc", label:"Tipo de documento entregue", type:"text", ph:"Laudo Psicológico / Relatório Psicológico / Atestado..." },
      { id:"refDoc", label:"Referente a", type:"text", ph:"Avaliação Neuropsicológica / Acompanhamento Psicológico..." },
      { id:"psiNome", label:"Psicóloga (nome e CRP)", type:"text", ph:"Nome — CRP-XX/XXXXX" },
      { id:"local", label:"Cidade e data", type:"text", ph:"Cidade, DD/MM/AAAA" },
    ]
  },
];

/* ════════════════════════════════════════════
   EXPORT UTILITIES
   ════════════════════════════════════════════ */
function buildExportHTML(doc, data) {
  const v = (id) => data[id] || "";
  const sec = (title) => `<h2 style="font-size:13pt;color:#1a365d;border-bottom:1pt solid #2b6cb0;padding-bottom:4pt;margin-top:16pt;">${title}</h2>`;
  const fld = (label, val) => val ? `<p><b>${label}:</b> ${val}</p>` : "";
  const bigField = (val) => val ? `<p style="text-align:justify;line-height:1.6;">${val.replace(/\n/g,"<br>")}</p>` : "";
  const sig = (nome, crp) => `<div style="text-align:center;margin-top:40pt;"><p>_______________________________________________</p><p><b>${nome || "[Nome da Psicóloga]"}</b></p><p>${crp || "[CRP-XX/XXXXX]"}</p></div>`;
  const header = (title) => `<h1 style="font-size:16pt;text-align:center;margin-bottom:6pt;">${title}</h1>`;
  const timbre = v("timbre") ? `<p style="text-align:center;color:#666;margin-bottom:12pt;">${v("timbre")}</p>` : "";
  const validadeText = v("validade") ? `<p>As informações contidas neste documento possuem validade de <b>${v("validade")}</b>, ressaltando-se a natureza dinâmica e não cristalizada dos fenômenos psicológicos.</p>` : "";
  const sigiloText = `<p style="font-size:9pt;color:#555;">Este documento não poderá ser utilizado para fins diferentes do indicado. Possui caráter sigiloso e extrajudicial.</p>`;

  switch(doc.id) {
    case "declaracao": {
      const tipo = v("tipo") || "Comparecimento a atendimento";
      let corpo = "";
      if (tipo.includes("Comparecimento")) corpo = `compareceu ao atendimento psicológico no dia ${v("dataAtend")}, ${v("horario")}, no ${v("servico")}.`;
      else if (tipo.includes("Acompanhamento")) corpo = `encontra-se em acompanhamento psicológico no ${v("servico")}, com frequência ${v("frequencia")}, ${v("horario")}${v("previsao") ? `, com previsão de encerramento em ${v("previsao")}` : ""}.`;
      else corpo = `acompanha ${v("nomePaciente")}, o(a) qual encontra-se em atendimento psicológico no ${v("servico")}, com frequência ${v("frequencia")}, ${v("horario")}.`;
      return `${timbre}${header("DECLARAÇÃO")}<p style="text-align:justify;">Declara-se, para fins de ${v("finalidade")}, que <b>${v("nome")}</b>, CPF nº ${v("cpf")}, ${corpo}</p>${sig(v("psiNome"),v("psiCRP"))}<p style="text-align:center;font-size:10pt;">${v("local")}</p>`;
    }
    case "atestado":
      return `${timbre}${header("ATESTADO PSICOLÓGICO")}<p style="text-align:justify;">Atesta-se, para fins de ${v("finalidade")}, que <b>${v("nome")}</b>, ${v("idade")}, CPF nº ${v("cpf")}, foi submetido(a) a processo de avaliação psicológica, cujos resultados indicam ${v("conclusao")}.</p><p style="text-align:justify;">${v("recomendacao")}</p>${validadeText}${sig(v("psiNome"),v("psiCRP"))}<p style="text-align:center;font-size:10pt;">${v("local")}</p>`;
    case "relatorio":
      return `${timbre}${header("RELATÓRIO PSICOLÓGICO")}${v("subtitulo")?`<p style="text-align:center;color:#666;">${v("subtitulo")}</p>`:""}${sec("1. IDENTIFICAÇÃO")}${fld("Pessoa atendida",v("nome"))}${fld("Data de nascimento",v("dataNasc"))}${fld("Idade",v("idade"))}${fld("Documento",v("doc"))}${fld("Responsável legal",v("responsavel"))}${fld("Outras informações",v("outrasInfo"))}${fld("Solicitante",v("solicitante"))}${fld("Finalidade",v("finalidade"))}${fld("Autora",v("psiNome"))}${sec("2. DESCRIÇÃO DA DEMANDA")}${bigField(v("demanda"))}${sec("3. PROCEDIMENTOS")}${bigField(v("procedimentos"))}${sec("4. ANÁLISE")}${bigField(v("analise"))}${sec("5. CONCLUSÃO")}${bigField(v("conclusao"))}${validadeText}${sigiloText}${v("referencias")?sec("REFERÊNCIAS")+bigField(v("referencias")):""}${sig(v("psiNome"),"")}`;
    case "laudo":
      return `${timbre}${header("LAUDO PSICOLÓGICO")}${v("subtitulo")?`<p style="text-align:center;color:#666;">${v("subtitulo")}</p>`:""}${sec("1. IDENTIFICAÇÃO")}${fld("Pessoa atendida",v("nome"))}${fld("Data de nascimento / Idade",v("dataNasc"))}${fld("Documento",v("doc"))}${fld("Responsável legal",v("responsavel"))}${fld("Outras informações",v("outrasInfo"))}${fld("Solicitante",v("solicitante"))}${fld("Finalidade",v("finalidade"))}${fld("Autora",v("psiNome"))}${sec("2. DESCRIÇÃO DA DEMANDA")}${bigField(v("demanda"))}${sec("3. PROCEDIMENTOS")}${bigField(v("procedimentos"))}${sec("4. ANÁLISE")}${bigField(v("analise"))}${sec("5. CONCLUSÃO")}${bigField(v("conclusao"))}${validadeText}${sigiloText}${sec("REFERÊNCIAS (obrigatórias)")}${bigField(v("referencias"))}${sig(v("psiNome"),"")}`;
    case "parecer":
      return `${timbre}${header("PARECER PSICOLÓGICO")}${v("subtitulo")?`<p style="text-align:center;color:#666;">${v("subtitulo")}</p>`:""}${sec("1. IDENTIFICAÇÃO")}${fld("Objeto do parecer",v("objeto"))}${fld("Solicitante",v("solicitante"))}${fld("Finalidade",v("finalidade"))}${fld("Autora",v("psiNome"))}${fld("Titulação",v("titulacao"))}${sec("2. DESCRIÇÃO DA DEMANDA")}${bigField(v("demanda"))}${sec("3. ANÁLISE")}${bigField(v("analise"))}${sec("4. CONCLUSÃO")}${bigField(v("conclusao"))}${sigiloText}${sec("REFERÊNCIAS (obrigatórias)")}${bigField(v("referencias"))}${sig(v("psiNome"),"")}`;
    default: {
      let html = `${timbre || ""}${header(doc.title)}`;
      doc.fields.forEach(f => {
        if (f.type === "textarea") html += `${sec(f.label)}${bigField(v(f.id))}`;
        else html += fld(f.label, v(f.id));
      });
      return html;
    }
  }
}

function exportDOCX(doc, data) {
  const content = buildExportHTML(doc, data);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000}h1{margin-bottom:12pt}h2{margin-top:14pt}p{margin:4pt 0}table{border-collapse:collapse;width:100%}td,th{border:1pt solid #999;padding:4pt 6pt}</style></head><body>${content}</body></html>`;
  const blob = new Blob(["\ufeff"+html], {type:"application/msword"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.title.replace(/\s/g,"_")}.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function exportPDF(doc, data) {
  const content = buildExportHTML(doc, data);
  const w = window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title><style>@page{size:A4;margin:2cm}@media print{body{margin:0}}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000;max-width:700px;margin:20px auto;padding:20px}h1{font-size:16pt;text-align:center}h2{font-size:13pt;color:#1a365d;border-bottom:1pt solid #2b6cb0;padding-bottom:4pt;margin-top:16pt}p{margin:4pt 0;text-align:justify}</style></head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

/* ════════════════════════════════════════════
   REACT COMPONENTS
   ════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:${C.bg};overflow:hidden}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
.fade-in{animation:fadeIn .4s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.slide-in{animation:slideIn .35s ease}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.pulse-border{animation:pulseBorder 2s ease infinite}
@keyframes pulseBorder{0%,100%{box-shadow:0 0 0 0 rgba(129,140,248,0.3)}50%{box-shadow:0 0 0 4px rgba(129,140,248,0.1)}}
`;

function NoteBox({ note }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:12,padding:"14px 18px",marginBottom:20,border:"1px solid #4338ca",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{color:C.accentBright,fontWeight:600,fontSize:13,letterSpacing:.3}}>📌 NOTA DE ORIENTAÇÃO</span>
        <span style={{color:C.light,fontSize:12}}>{open?"▲ Fechar":"▼ Expandir"}</span>
      </div>
      {open && (
        <div className="fade-in" style={{marginTop:12,display:"grid",gap:8}}>
          {[["🕐 Quando usar",note.uso],["👤 Quem pode solicitar",note.quem],["🚫 Vedações",note.veda],["📖 Base legal",note.base]].map(([l,v])=>v&&v!=="—"&&(
            <div key={l} style={{fontSize:12.5,lineHeight:1.5}}>
              <span style={{color:C.warn,fontWeight:600}}>{l}: </span>
              <span style={{color:"#cbd5e1"}}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ field, value, onChange }) {
  const base = {width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.borderDark}`,background:"#1e293b",color:"#e2e8f0",fontSize:13.5,fontFamily:"'DM Sans',sans-serif",outline:"none",transition:"border-color .2s,box-shadow .2s"};
  const focus = {borderColor:C.accent,boxShadow:`0 0 0 3px rgba(129,140,248,0.15)`};
  const [focused, setFocused] = useState(false);
  const style = {...base,...(focused?focus:{})};

  if (field.type === "select") {
    return (
      <div style={{marginBottom:14}}>
        <label style={{display:"block",fontSize:11.5,color:C.light,marginBottom:4,fontWeight:500,letterSpacing:.3}}>{field.label}</label>
        <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...style,cursor:"pointer"}}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
          <option value="">Selecione...</option>
          {field.opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div style={{marginBottom:14}}>
        <label style={{display:"block",fontSize:11.5,color:C.light,marginBottom:4,fontWeight:500,letterSpacing:.3}}>{field.label}</label>
        <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.ph}
          rows={4} style={{...style,resize:"vertical",minHeight:80,lineHeight:1.6}}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} />
      </div>
    );
  }
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:11.5,color:C.light,marginBottom:4,fontWeight:500,letterSpacing:.3}}>{field.label}</label>
      <input type="text" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.ph}
        style={style} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} />
    </div>
  );
}

function Wizard({ onSelect }) {
  const [path, setPath] = useState(["start"]);
  const [result, setResult] = useState(null);
  const current = WIZARD.find(w => w.id === path[path.length - 1]);

  const handleOption = (opt) => {
    if (opt.result) {
      setResult(opt.result);
    } else {
      setPath([...path, opt.next]);
    }
  };
  const goBack = () => {
    if (result) { setResult(null); return; }
    if (path.length > 1) setPath(path.slice(0, -1));
  };
  const resultDoc = result ? DOCS.find(d => d.id === result) : null;

  return (
    <div className="fade-in" style={{maxWidth:720,margin:"0 auto",padding:"40px 20px"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:700,color:"#fff",letterSpacing:-.5}}>
          Assistente de Documentos
        </h1>
        <p style={{color:C.light,fontSize:14,marginTop:8}}>Responda as perguntas para encontrar o documento ideal para sua situação</p>
      </div>

      {/* Progress */}
      <div style={{display:"flex",gap:6,marginBottom:32,justifyContent:"center"}}>
        {path.map((_, i) => (
          <div key={i} style={{width:i===path.length-1&&!result?32:12,height:5,borderRadius:3,background:i===path.length-1&&!result?C.accent:"#334155",transition:"all .3s"}} />
        ))}
        {result && <div style={{width:32,height:5,borderRadius:3,background:C.green}} />}
      </div>

      {path.length > 1 && (
        <button onClick={goBack} style={{background:"none",border:"none",color:C.light,cursor:"pointer",fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
          ← Voltar
        </button>
      )}

      {!result && current && (
        <div className="slide-in" key={current.id}>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:21,fontWeight:600,color:"#f1f5f9",marginBottom:6}}>{current.q}</h2>
          <p style={{color:C.light,fontSize:13,marginBottom:24}}>{current.sub}</p>
          <div style={{display:"grid",gap:12}}>
            {current.opts.map((opt, i) => (
              <button key={i} onClick={() => handleOption(opt)}
                style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid #334155",borderRadius:14,padding:"18px 20px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:14,transition:"all .2s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 20px rgba(99,102,241,0.15)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
                <span style={{fontSize:28,lineHeight:1}}>{opt.icon}</span>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:15,color:"#f1f5f9",marginBottom:3}}>{opt.label}</div>
                  <div style={{fontSize:12.5,color:C.light,lineHeight:1.4}}>{opt.desc}</div>
                </div>
                <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",color:C.light,fontSize:18}}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && resultDoc && (
        <div className="slide-in" style={{textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#065f46,#047857)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32}}>
            {resultDoc.icon}
          </div>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:700,color:C.green,marginBottom:8}}>
            {resultDoc.title}
          </h2>
          <p style={{color:"#cbd5e1",fontSize:14,lineHeight:1.6,marginBottom:8}}>{resultDoc.desc}</p>
          <p style={{color:C.light,fontSize:12,marginBottom:28}}>{CATS[resultDoc.cat].sub}</p>
          <NoteBox note={resultDoc.note} />
          <button onClick={() => onSelect(resultDoc.id)}
            style={{background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,color:"#fff",border:"none",borderRadius:12,padding:"14px 36px",fontSize:15,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",transition:"transform .2s,box-shadow .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(99,102,241,0.3)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
            Usar este modelo →
          </button>
          <button onClick={() => { setResult(null); setPath(["start"]); }}
            style={{display:"block",margin:"16px auto 0",background:"none",border:"none",color:C.light,cursor:"pointer",fontSize:13}}>
            Recomeçar assistente
          </button>
        </div>
      )}
    </div>
  );
}

function DocEditor({ docId, onBack }) {
  const doc = DOCS.find(d => d.id === docId);
  const [data, setData] = useState({});
  const previewRef = useRef();

  const update = (id, val) => setData(prev => ({...prev, [id]: val}));

  if (!doc) return null;

  return (
    <div className="fade-in" style={{display:"flex",height:"100%",overflow:"hidden"}}>
      {/* Left: Form Panel */}
      <div style={{width:380,minWidth:380,background:"#0f172a",borderRight:"1px solid #1e293b",overflowY:"auto",padding:"20px 18px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.light,cursor:"pointer",fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
          ← Voltar
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:28}}>{doc.icon}</span>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,color:"#f1f5f9"}}>{doc.title}</h2>
        </div>
        <p style={{fontSize:12,color:C.light,marginBottom:16,lineHeight:1.5}}>{doc.desc}</p>
        <NoteBox note={doc.note} />

        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.muted,fontWeight:600,marginBottom:12}}>Preencha os campos</div>
        {doc.fields.map(f => <Field key={f.id} field={f} value={data[f.id]} onChange={v=>update(f.id,v)} />)}
      </div>

      {/* Right: Preview + Actions */}
      <div style={{flex:1,overflowY:"auto",background:"#1a1f36",padding:30}}>
        {/* Action bar */}
        <div style={{display:"flex",gap:10,marginBottom:20,justifyContent:"flex-end"}}>
          <ActionBtn label="📄 Gerar PDF" color="#0ea5e9" onClick={()=>exportPDF(doc,data)} />
          <ActionBtn label="📝 Gerar DOCX" color={C.accent} onClick={()=>exportDOCX(doc,data)} />
        </div>

        {/* Paper preview */}
        <div ref={previewRef} style={{background:"#fff",color:"#1e293b",maxWidth:680,margin:"0 auto",padding:"50px 48px",borderRadius:4,boxShadow:"0 4px 30px rgba(0,0,0,0.4)",fontFamily:"Arial,sans-serif",fontSize:"11pt",lineHeight:1.6,minHeight:600}}>
          <PaperContent doc={doc} data={data} />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"transform .15s,box-shadow .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 4px 16px ${color}44`}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
      {label}
    </button>
  );
}

function PaperContent({ doc, data }) {
  const v = (id, fallback) => data[id] || `[${fallback || doc.fields.find(f=>f.id===id)?.label || id}]`;
  const empty = (id) => !data[id];
  const ph = (id) => empty(id) ? {color:"#94a3b8",fontStyle:"italic"} : {};
  const secStyle = {fontSize:"13pt",color:"#1a365d",borderBottom:"1pt solid #2b6cb0",paddingBottom:3,marginTop:18,marginBottom:8,fontWeight:700};
  const fldLine = (label, id) => <p><b>{label}:</b> <span style={ph(id)}>{v(id, label)}</span></p>;
  const bigBlock = (id, label) => <p style={{textAlign:"justify",...ph(id)}}>{data[id] ? data[id].split("\n").map((l,i)=><span key={i}>{l}<br/></span>) : `[${label}]`}</p>;

  switch(doc.id) {
    case "declaracao": {
      const tipo = data.tipo || "";
      return (<>
        {data.timbre && <p style={{textAlign:"center",color:"#666"}}>{data.timbre}</p>}
        <h1 style={{textAlign:"center",fontSize:"16pt",margin:"16pt 0"}}>DECLARAÇÃO</h1>
        <p style={{textAlign:"justify"}}>
          Declara-se, para fins de <span style={ph("finalidade")}>{v("finalidade","finalidade específica")}</span>,
          que <b><span style={ph("nome")}>{v("nome","Nome completo")}</span></b>,
          CPF nº <span style={ph("cpf")}>{v("cpf","000.000.000-00")}</span>,
          {tipo.includes("Comparecimento") ? <> compareceu ao atendimento psicológico no dia <span style={ph("dataAtend")}>{v("dataAtend","data")}</span>, <span style={ph("horario")}>{v("horario","horário")}</span>, no <span style={ph("servico")}>{v("servico","nome do serviço")}</span>.</> :
           tipo.includes("Acompanhamento") ? <> encontra-se em acompanhamento psicológico no <span style={ph("servico")}>{v("servico","nome do serviço")}</span>, com frequência <span style={ph("frequencia")}>{v("frequencia","frequência")}</span>, <span style={ph("horario")}>{v("horario","horário")}</span>{data.previsao ? <>, com previsão de encerramento em <span>{data.previsao}</span></> : null}.</> :
           tipo.includes("Acompanhante") ? <> acompanha <span style={ph("nomePaciente")}>{v("nomePaciente","nome do paciente")}</span>, o(a) qual encontra-se em atendimento psicológico no <span style={ph("servico")}>{v("servico","serviço")}</span>, com frequência <span style={ph("frequencia")}>{v("frequencia","frequência")}</span>, <span style={ph("horario")}>{v("horario","horário")}</span>.</> :
           <span style={{color:"#94a3b8",fontStyle:"italic"}}> [selecione o tipo de declaração no formulário]</span>}
        </p>
        <div style={{textAlign:"center",marginTop:48}}>
          <p style={ph("local")}>{v("local","Local e data")}</p>
          <p style={{marginTop:28}}>_______________________________________________</p>
          <p><b style={ph("psiNome")}>{v("psiNome","Nome da Psicóloga")}</b></p>
          <p style={ph("psiCRP")}>{v("psiCRP","CRP-XX/XXXXX")}</p>
        </div>
      </>);
    }
    case "atestado": return (<>
      {data.timbre && <p style={{textAlign:"center",color:"#666"}}>{data.timbre}</p>}
      <h1 style={{textAlign:"center",fontSize:"16pt",margin:"16pt 0"}}>ATESTADO PSICOLÓGICO</h1>
      <p style={{textAlign:"justify"}}>
        Atesta-se, para fins de <span style={ph("finalidade")}>{v("finalidade")}</span>,
        que <b><span style={ph("nome")}>{v("nome")}</span></b>, <span style={ph("idade")}>{v("idade")}</span>,
        CPF nº <span style={ph("cpf")}>{v("cpf")}</span>,
        foi submetido(a) a processo de avaliação psicológica, cujos resultados indicam <span style={ph("conclusao")}>{v("conclusao","conclusão técnica")}</span>.
      </p>
      <p style={{textAlign:"justify",...ph("recomendacao")}}>{data.recomendacao || "[Recomendação: afastamento, aptidão etc.]"}</p>
      {(data.validade) && <p>O presente atestado possui validade de <b>{data.validade}</b>, ressaltando-se a natureza dinâmica e não cristalizada dos fenômenos psicológicos.</p>}
      <div style={{textAlign:"center",marginTop:48}}>
        <p style={ph("local")}>{v("local")}</p>
        <p style={{marginTop:28}}>_______________________________________________</p>
        <p><b style={ph("psiNome")}>{v("psiNome")}</b></p>
        <p style={ph("psiCRP")}>{v("psiCRP")}</p>
      </div>
    </>);
    default: {
      // Generic structured document renderer
      const isStructured = ["relatorio","relatorio_multi","laudo","parecer"].includes(doc.id);
      const textFields = doc.fields.filter(f => f.type === "textarea");
      const metaFields = doc.fields.filter(f => f.type !== "textarea");

      return (<>
        {data.timbre && <p style={{textAlign:"center",color:"#666"}}>{data.timbre}</p>}
        <h1 style={{textAlign:"center",fontSize:"16pt",margin:"16pt 0"}}>{doc.title.toUpperCase()}</h1>
        {data.subtitulo && <p style={{textAlign:"center",color:"#666",marginBottom:12}}>{data.subtitulo}</p>}

        {isStructured && <>
          <h2 style={secStyle}>1. IDENTIFICAÇÃO</h2>
          {metaFields.filter(f=>!["timbre","subtitulo","local","validade","referencias","psiNome"].includes(f.id)).map(f => (
            <p key={f.id}><b>{f.label}:</b> <span style={ph(f.id)}>{v(f.id)}</span></p>
          ))}
          {metaFields.find(f=>f.id==="psiNome") && <p><b>Autora:</b> <span style={ph("psiNome")}>{v("psiNome")}</span></p>}
        </>}

        {!isStructured && metaFields.filter(f=>f.id!=="timbre"&&f.id!=="local"&&f.id!=="psiNome"&&f.id!=="psiCRP").map(f => (
          <p key={f.id}><b>{f.label}:</b> <span style={ph(f.id)}>{v(f.id)}</span></p>
        ))}

        {textFields.map((f, i) => (
          <div key={f.id}>
            <h2 style={secStyle}>{isStructured ? `${i+2}. ${f.label.toUpperCase()}` : f.label}</h2>
            {bigBlock(f.id, f.label)}
          </div>
        ))}

        {data.validade && <p style={{marginTop:12}}>Validade: <b>{data.validade}</b> — natureza dinâmica e não cristalizada dos fenômenos psicológicos.</p>}

        <p style={{fontSize:"9pt",color:"#555",marginTop:16}}>Este documento possui caráter sigiloso e extrajudicial.</p>

        <div style={{textAlign:"center",marginTop:48}}>
          <p style={ph("local")}>{v("local","Local e data")}</p>
          <p style={{marginTop:28}}>_______________________________________________</p>
          <p><b style={ph("psiNome")}>{v("psiNome","Psicóloga")}</b></p>
          {doc.fields.find(f=>f.id==="psiCRP") && <p style={ph("psiCRP")}>{v("psiCRP","CRP")}</p>}
        </div>
      </>);
    }
  }
}

/* ════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState("wizard"); // wizard | catalog | editor
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const openDoc = (id) => { setSelectedDoc(id); setView("editor"); };
  const goHome = () => { setView("wizard"); setSelectedDoc(null); };
  const goCatalog = () => { setView("catalog"); setSelectedDoc(null); };

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:C.bg,color:"#e2e8f0"}}>
      <style>{css}</style>

      {/* ── SIDEBAR ── */}
      <div style={{width:sidebarOpen?270:56,minWidth:sidebarOpen?270:56,background:`linear-gradient(180deg,${C.sidebar},#0B1120)`,borderRight:"1px solid #1e293b",display:"flex",flexDirection:"column",transition:"all .3s ease",overflow:"hidden"}}>
        {/* Logo */}
        <div style={{padding:sidebarOpen?"20px 18px":"20px 12px",borderBottom:"1px solid #1e293b",cursor:"pointer"}} onClick={()=>setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? (
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:16,color:"#fff",letterSpacing:-.3}}>
                <span style={{color:C.accent}}>Psi</span>Docs
              </div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>Manual CFP 2025</div>
            </div>
          ) : (
            <div style={{fontSize:20,textAlign:"center",color:C.accent}}>Ψ</div>
          )}
        </div>

        {/* Nav */}
        <div style={{padding:"12px 0",flex:1,overflowY:"auto"}}>
          <SidebarItem icon="🧭" label="Assistente" active={view==="wizard"} open={sidebarOpen} onClick={goHome} />
          <SidebarItem icon="📚" label="Todos os Documentos" active={view==="catalog"} open={sidebarOpen} onClick={goCatalog} />

          {sidebarOpen && <div style={{height:1,background:"#1e293b",margin:"12px 16px"}} />}

          {sidebarOpen && CATS.map(cat => (
            <div key={cat.id}>
              <div style={{padding:"10px 18px 4px",fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:C.muted,fontWeight:600}}>
                {cat.label}
              </div>
              {DOCS.filter(d=>d.cat===cat.id).map(d => (
                <SidebarItem key={d.id} icon={d.icon} label={d.title} active={selectedDoc===d.id} open={sidebarOpen}
                  onClick={()=>openDoc(d.id)} small />
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{padding:"12px 18px",borderTop:"1px solid #1e293b",fontSize:10,color:C.muted}}>
            Res. CFP nº 06/2019<br/>Res. CFP nº 01/2009
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {view === "wizard" && (
          <div style={{flex:1,overflowY:"auto"}}>
            <Wizard onSelect={openDoc} />
          </div>
        )}

        {view === "catalog" && (
          <div style={{flex:1,overflowY:"auto",padding:30}} className="fade-in">
            <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:700,color:"#fff",marginBottom:6}}>Catálogo de Documentos</h1>
            <p style={{color:C.light,fontSize:14,marginBottom:28}}>Todos os 13 modelos previstos no Manual CFP 2025</p>
            {CATS.map(cat => (
              <div key={cat.id} style={{marginBottom:28}}>
                <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,color:C.accentBright,marginBottom:4}}>{cat.label}</h2>
                <p style={{fontSize:12,color:C.muted,marginBottom:12}}>{cat.sub}</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                  {DOCS.filter(d=>d.cat===cat.id).map(d => (
                    <button key={d.id} onClick={()=>openDoc(d.id)}
                      style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid #334155",borderRadius:14,padding:"18px 20px",cursor:"pointer",textAlign:"left",transition:"all .2s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(99,102,241,0.12)"}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <span style={{fontSize:22}}>{d.icon}</span>
                        <span style={{fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:14,color:"#f1f5f9"}}>{d.title}</span>
                      </div>
                      <p style={{fontSize:12,color:C.light,lineHeight:1.4}}>{d.desc}</p>
                      <div style={{marginTop:10,fontSize:10.5,color:C.accent,fontWeight:500}}>Abrir modelo →</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "editor" && selectedDoc && (
          <DocEditor docId={selectedDoc} onBack={goHome} />
        )}
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, open, onClick, small }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:open?(small?"6px 18px 6px 26px":"10px 18px"):"10px 0",
        background:active?"rgba(129,140,248,0.12)":hovered?"rgba(255,255,255,0.04)":"transparent",
        border:"none",borderLeft:active?`3px solid ${C.accent}`:"3px solid transparent",
        color:active?"#fff":hovered?"#cbd5e1":"#94a3b8",cursor:"pointer",fontSize:small?12.5:13,
        fontFamily:"'DM Sans',sans-serif",fontWeight:active?600:400,transition:"all .15s",textAlign:"left",
        justifyContent:open?"flex-start":"center"}}>
      <span style={{fontSize:small?14:16}}>{icon}</span>
      {open && <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>}
    </button>
  );
}