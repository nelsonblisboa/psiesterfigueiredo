import sys
import os

# Caminho do projeto no PythonAnywhere
project_home = '/home/psiesterfigueiredo/site_projeto_codigo'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Carrega as variáveis de ambiente do arquivo .env
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# Importa o app do FastAPI e converte para WSGI usando o a2wsgi
from main import app as asgi_app
from a2wsgi import ASGIMiddleware

# Define o entrypoint WSGI esperado pelo PythonAnywhere
application = ASGIMiddleware(asgi_app)
