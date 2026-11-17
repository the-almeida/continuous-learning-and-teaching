// Dados fixos do site. Nome completo, "Psicóloga" e CRP são exigência do conselho em toda divulgação.
export const site = {
	url: 'https://example.com',
	nome: 'Nome Sobrenome',
	nomeCompleto: 'Nome Sobrenome',
	profissao: 'Psicóloga',
	crp: 'CRP 00/00000',
	descricao: 'Nome Sobrenome, psicóloga (CRP 00/00000). Psicoterapia sistêmica online para mulheres, com olhar integrativo e atenção à saúde da mulher e à perimenopausa.',
	email: 'psicologa@example.com',
	whatsapp: '5500000000000',
	// Sem dado de saúde: a mensagem fica no histórico do WhatsApp de quem clica.
	mensagemWhatsapp: 'Olá, vim pelo site e gostaria de saber mais sobre os atendimentos.',
	// Enquanto a página de política de privacidade não existe, o link do rodapé abre o WhatsApp com esta pergunta.
	mensagemPrivacidade: 'Olá, vim pelo site e gostaria de saber sobre a política de privacidade: quais dados o site coleta e como eles são usados.',
	// ID do site no Umami Cloud (Website ID), como no repo oficial. Vazio, o site não carrega analytics.
	umami: '',
};

// "5500000000000" → "(00) 00000-0000"
export const telefoneWhatsapp = site.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');

export const linkWhatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.mensagemWhatsapp)}`;

export const linkPrivacidade = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.mensagemPrivacidade)}`;
