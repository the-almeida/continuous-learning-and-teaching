# Imagens do protótipo

Todas as fotos de banco são do StockSnap, com licença CC0: uso comercial livre, sem obrigação de crédito. Encontradas pelo Openverse, filtrando só CC0.

O protótipo usa a versão de 960 px de largura. Antes de ir para produção, baixar a original pelo link (no navegador, porque a página tem verificação contra robô) e trocar o arquivo em `src/assets/fotos/` mantendo o nome.

| Arquivo | Onde aparece | Título no banco | Original | Licença | Link |
|---|---|---|---|---|---|
| `folha-samambaia.jpg` | A · abertura | Nature Ferns | 5184x3456 | CC0 | https://stocksnap.io/photo/nature-ferns-AMI5TLKLUX |
| `folha-gotas.jpg` | A · abordagem | Rain Droplets | 6000x4000 | CC0 | https://stocksnap.io/photo/rain-droplets-GZQDZRNROV |
| `folha-bordo.jpg` | A · saúde da mulher | Green Leaves | 4288x2848 | CC0 | https://stocksnap.io/photo/green-leaves-D88IPQXO5O |
| `sombra-cortina.jpg` | A · saberes complementares | House Home | 1944x1256 | CC0 | https://stocksnap.io/photo/house-home-HWIHTQVHX5 |
| `cha-livros.jpg` | A · convite | Books Reading | 2750x1654 | CC0 | https://stocksnap.io/photo/books-reading-2XTL98GVVF |
| `poltrona.jpg` | B · convite | House Home | 4272x2848 | CC0 | https://stocksnap.io/photo/house-home-6M49G7YDLK |
| `lavanda-seca.jpg` | B · saberes complementares | Lavender Herb | 4256x2832 | CC0 | https://stocksnap.io/photo/lavender-herb-T3HQNAXDJO |
| `montanhas-amanhecer.jpg` | C e D · abertura | Sunrise Mountain | 5184x3456 | CC0 | https://stocksnap.io/photo/sunrise-mountain-FTN7PGQBCW |
| `lago-montanhas.jpg` | C e D · saúde da mulher | Lake River | 1920x1200 | CC0 | https://stocksnap.io/photo/lake-river-CNC1TP66C1 |
| `cha-manta.jpg` | C e D · saberes complementares | Coffee Tea | 2883x1754 | CC0 | https://stocksnap.io/photo/coffee-tea-4VHE7E68OE |
| `mar-amanhecer.jpg` | C e D · convite | Ocean Water | 6000x4000 | CC0 | https://stocksnap.io/photo/ocean-water-1WUOLZEU6J |
| `retrato.jpeg` | Quem te escuta, nos três | No lugar da foto da cliente, que não é pública: recorte 3:4 de House Home | 480x640 | CC0 | https://stocksnap.io/photo/house-home-6M49G7YDLK |

## Design E

Cada lugar tem um arquivo próprio em `src/assets/fotos/design-e/`. Para trocar uma foto, troque o arquivo, com o mesmo nome e a mesma proporção. Todas estão em 960 px, a versão que o banco entrega sem navegador.

| Arquivo | Onde aparece | Proporção na tela | Título no banco | Licença | Link |
|---|---|---|---|---|---|
| `design-e/abertura.jpg` | abertura da home | 16:9, com o assunto nos 30% da direita | Nature Ferns | CC0 | https://stocksnap.io/photo/nature-ferns-AMI5TLKLUX |
| `design-e/abordagem.jpg` | Abordagem | 4:3 | Rain Droplets | CC0 | https://stocksnap.io/photo/rain-droplets-GZQDZRNROV |
| `design-e/saude-da-mulher.jpg` | Saúde da mulher, na home | 5:4 | Palm Leaves | CC0 | https://stocksnap.io/photo/palm-leaves-1JJKERC4SK |
| `design-e/saberes-complementares.jpg` | Saberes complementares, na home | 5:4 | House Home | CC0 | https://stocksnap.io/photo/house-home-HWIHTQVHX5 |
| `design-e/convite.jpg` | encerramento, com o texto em cima | faixa larga, escura e de alto contraste | Leaves Green | CC0 | https://stocksnap.io/photo/leaves-green-FZI5YP1VSC |
| `design-e/pagina-saude.jpg` | página de Saúde, ao lado das quatro partes | vertical, cerca de 3:4 | Dark Green | CC0 | https://stocksnap.io/photo/dark-green-6WS2NTFGOM |
| `design-e/pagina-saberes.jpg` | página de Saberes, ao lado das formações | horizontal, cerca de 4:3 | Office Work | CC0 | https://stocksnap.io/photo/office-work-FY87BH4RPX |

As três que repetem fotos do A têm um byte a mais no fim do arquivo, para o Astro não juntar as duas e renomear a imagem nas rotas antigas. Ao trocar por outra foto, isso deixa de importar.

O design E não usa foto nos ícones nem nos desenhos das páginas, que estão em `src/components/IconeDesenhado.astro` e `src/components/Fio.astro`.

O design B usa desenhos de traço feitos no próprio código (em `src/components/Arte.astro` e `src/components/Icone.astro`), sem imagem de banco na abertura.
