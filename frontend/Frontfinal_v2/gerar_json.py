import json
import os

def gerar_json_local():
    # Caminho da pasta onde estão as fotos
    pasta = "frontsubir/static/figurinhas"
    album_data = []
    
    # --- DEFINA AS RARIDADES AQUI ---
    # Exemplo: IDs que você quer que sejam especiais
    ids_raros = [1, 2, 3, 4, 112, 113, 114, 122, 123, 124, 132, 133, 134, 142, 143, 144, 152, 153, 154, 162, 163, 164, 172, 173, 174, 182, 183, 184, 192, 193, 194, 202, 203, 204, 205, 212, 213, 214, 222, 223, 227, 228, 232, 233, 242, 243, 256, 257, 258, 266]
    
    if not os.path.exists(pasta):
        print(f"Erro: A pasta {pasta} não foi encontrada.")
        return

    arquivos = os.listdir(pasta)
    
    for arquivo in arquivos:
        if arquivo.endswith(('.jpg', '.png', '.jpeg', '.svg')):
            # Extrai o ID do nome do arquivo
            id_str = arquivo.split('.')[0]
            
            try:
                id_fig = int(id_str)
            except ValueError:
                continue # Pula arquivos que não começam com número
            
            # Lógica para definir a raridade baseada nos IDs acima
            if id_fig in ids_raros:
                raridade = "rare"
            else:
                raridade = "common"
            
            # MONTAGEM DO OBJETO
            album_data.append({
                "id": id_fig,
                "nome": f"Colaborador {id_fig}",
                "rarity": raridade, # Usando 'rarity' (em inglês) para bater com o seu JS
                "url_imagem": arquivo # Guardamos apenas o nome do arquivo (ex: "1.png")
            })
    
    # Ordena por ID
    album_data.sort(key=lambda x: x['id'])

    with open('album.json', 'w', encoding='utf-8') as f:
        json.dump(album_data, f, indent=4, ensure_ascii=False)
    
    print(f"Gerado album.json com {len(album_data)} figurinhas.")
    print(f"Raras: {len([x for x in album_data if x['rarity'] == 'rare'])}")

gerar_json_local()