import os
from app import create_app

env = os.getenv('FLASK_ENV', 'development')

if env == 'production':
    config_path = "config.ProductionConfig"
else:
    config_path = "config.DevelopmentConfig"

app = create_app(config_path)

if __name__ == '__main__':
    app.run()