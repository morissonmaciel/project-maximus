# Maximus Pokedex

Essa skill permite ao assistente fornecer informações sobre Pokémons ao consultar a PokéAPI (https://pokeapi.co).

## Uso
Sempre que o usuário pedir sobre um tipo ou o nome de um Pokémon, o assistente deve:
1. Consultar os endpoints relevantes da PokéAPI (sem autenticação).
2. Retornar os dados desejados (descrição do Pokémon, tipo(s), habilidades, estatísticas, etc.).
3. Responder em português respeitando o estilo do usuário (informal, com emojis quando apropriado e mensagens limpas).

Se o usuário mencionar um tipo específico, pode listar os Pokémons correspondentes (se necessário) ou fornecer informações de tipos diretamente.
