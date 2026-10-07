"""Check manual: python test_theme_url.py

La ventana arranca con el tema guardado en la URL (`?theme=...`) para que
`index.html` lo aplique antes del primer pintado. Si esa URL saliera mal
armada, el tema se perdería en silencio y volvería el parpadeo, así que se
verifica con las dos URLs reales: la del build servido y la del dev server.
"""

import main

# El build servido: la URL ya termina en "/".
assert main.with_theme("http://127.0.0.1:50123/", "oscuro") == "http://127.0.0.1:50123/?theme=oscuro"

# El dev server: la URL no trae "/" final, y la consulta no puede quedar pegada al puerto.
assert main.with_theme(main.DEV_URL, "claro") == "http://localhost:1420/?theme=claro"

# 'sistema' también viaja: es el valor que le dice a la página "no fuerces nada".
assert main.with_theme("http://127.0.0.1:50123/", "sistema").endswith("?theme=sistema")

print("OK: la URL de arranque lleva el tema guardado")
