"""Check manual: python test_single.py

Verifica la instancia única: abrir el `.exe` dos veces no crea dos procesos.
Sin esto, X escondida + olvido de la bandeja + doble clic = N iconos y avisos
duplicados (pasó de verdad: 106 procesos a la vez).

Se prueba con un directorio de datos falso para no tocar el mutex real de la
app (si la app de desarrollo está corriendo, el mutex real ya está ocupado y
el test fallaría por el motivo equivocado).
"""

import main

falso = "C:\\temporal\\ahora-test-single"

# Primera: pasa. Segunda con el mismo directorio: no pasa.
assert main.ensure_single_instance(falso) is True
assert main.ensure_single_instance(falso) is False, "la segunda instancia debe terminar"
print("   ok  misma agenda dos veces: la segunda termina en silencio")

# Distinta agenda (desarrollo vs instalada): conviven. Si no, probar la
# instalada con el dev abierto fallaría en silencio y parecería que el
# instalador no anda.
assert main.ensure_single_instance("C:\\temporal\\ahora-test-otra") is True
print("   ok  distinta agenda: conviven")

print("OK: una sola instancia por agenda")
