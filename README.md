# Meal Planner

A web-based meal planner app.

* Backend: Python(Flask) + MySQL/MariaBD
* Frontend: React.js and some legacy jQuery
* Theme: based on https://bootswatch.com/minty/ but with some tweaking

## Environment

### Base system

```
apt install mariadb-server phpmyadmin
```

* Tested versions:
    * Python: `3.9`
    * Node.js: `14.19`,
    * npm: `6.14`,

### Python environment

```
python3 -m venv ./.venv/
source ./.venv/bin/activate
pip3 install -r requirements.txt
```

### Node.js environment

```
npm install
```

## Deployment

* Compile/Transpile : `node babelify.js [--dev|--prod]`
* Create tables as defined in `tables` directory