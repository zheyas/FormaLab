"""Intentionally vulnerable local-only training playground. Never deploy this app."""
from __future__ import annotations

import json
import html
import os
import random
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
UPLOADS = ROOT / "uploads"
DB = ROOT / "labmart.sqlite3"
HOST = "127.0.0.1"
PORT = 5000
MAX_BYTES = 1024 * 1024

# FAKE — deliberately detector-shaped sample credential; never valid and never used.
DEMO_API_KEY = "AKIAFAKE000000000000"  # VULN VC01 CWE-798 УБИ.074

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_BYTES
# VULN VC09 CWE-352 УБИ.042 — CSRF checks are intentionally absent in this standalone lab.
app.config["WTF_CSRF_ENABLED"] = False
UPLOADS.mkdir(exist_ok=True)

# Fake, seeded catalogue and identities only.
PRODUCTS = [
    ("chair-01", "Aster Lounge Chair", "Дом", 24900, "#d5dfd1", "Кресло из ясеня", "chair"),
    ("lamp-02", "Orbit Table Lamp", "Свет", 8900, "#e7d7c9", "Тёплый рассеянный свет", "lamp"),
    ("vase-03", "Forma Ceramic Vase", "Декор", 4200, "#d7dce5", "Ручная работа", "vase"),
    ("sofa-04", "Sora Modular Sofa", "Дом", 68900, "#e3ddd2", "Модульная система", "sofa"),
    ("clock-05", "Noma Wall Clock", "Декор", 6300, "#d8d1c3", "Тихий кварцевый ход", "clock"),
    ("chair-06", "Mori Dining Chair", "Дом", 11900, "#d9e3e4", "Массив бука", "chair"),
    ("lamp-07", "Arc Floor Lamp", "Свет", 15700, "#e8d9c8", "Графичная линия", "lamp"),
    ("vase-08", "Pebble Object", "Декор", 3100, "#e4ddd1", "Керамика и глазурь", "vase"),
]


def connect():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    return db


def request_data():
    """Read JSON for the SPA or normal HTML form fields for storefront pages."""
    return request.get_json(silent=True) or request.form.to_dict()


def init_db():
    with connect() as db:
        db.execute("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, category TEXT, price INTEGER, color TEXT, subtitle TEXT, art TEXT)")
        db.execute("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, customer_id INTEGER, item TEXT, status TEXT, total INTEGER)")
        db.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, customer_id INTEGER)")
        db.execute("CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY, username TEXT, amount INTEGER, status TEXT)")
        if not db.execute("SELECT 1 FROM products LIMIT 1").fetchone():
            db.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?)", PRODUCTS)
            db.executemany("INSERT INTO orders (customer_id,item,status,total) VALUES (?,?,?,?)", [
                (1001, "Orbit Table Lamp", "В пути", 8900), (1001, "Forma Ceramic Vase", "Доставлен", 4200),
                (1002, "Aster Lounge Chair", "Собирается", 24900), (1002, "Noma Wall Clock", "Доставлен", 6300)])
        if not db.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            # VULN VC03 CWE-521 УБИ.030 — intentionally weak seeded credentials, fake accounts only.
            db.executemany("INSERT INTO users VALUES (?,?,?)", [("admin", "admin", 1001), ("test", "123456", 1002)])


@app.after_request
def intentionally_sparse_headers(response):
    # VULN VC10 CWE-1021 УБИ.127 — missing CSP, X-Frame-Options, etc. for header-scanner practice.
    # VULN VC13 CWE-942 УБИ.127 — permissive wildcard CORS; app remains bound to loopback.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Forwarded-For"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.get("/")
def home():
    response = send_from_directory(STATIC, "index.html")
    # VULN W04-COOKIE CWE-1004 BDU:W04 — intentionally weak demo cookie with no security attributes.
    response.headers["Set-Cookie"] = "lab_session=guest-demo; Path=/"
    return response


def shop_page(title: str, content: str):
    return Response(f"<!doctype html><html lang='ru'><meta charset='utf-8'><title>{html.escape(title)} · Forma</title>"
                    "<meta name='viewport' content='width=device-width'><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 20px;color:#292820}"
                    "a{color:#425747}form,article{padding:16px;margin:14px 0;background:#f4f1eb;border-radius:10px}input,button{padding:9px;margin:5px}</style>"
                    f"<header><a href='/'>Forma</a> · <a href='/catalog'>Каталог</a> · <a href='/profile'>Профиль</a> · <a href='/delivery'>Доставка</a></header><main>{content}</main></html>",
                    mimetype="text/html")


@app.get("/catalog")
def catalog_page():
    # Ordinary catalogue page: search is part of the storefront, not a vulnerability directory.
    with connect() as db:
        rows = db.execute("SELECT id,name,category,price,subtitle FROM products ORDER BY rowid").fetchall()
    cards = "".join(f"<article><h2><a href='/product/{html.escape(r['id'])}'>{html.escape(r['name'])}</a></h2>"
                    f"<p>{html.escape(r['category'])} · {html.escape(r['subtitle'])}</p><b>{r['price']} ₽</b></article>" for r in rows)
    return shop_page("Каталог", "<h1>Предметы для дома</h1><form action='/api/products' method='get'><label>Поиск <input name='q' value='лампа'></label><button>Найти</button></form><form action='/api/regex-demo' method='post'><label>Подсказки поиска <input name='text' value='лампа'></label><button>Найти похожее</button></form>" + cards)


@app.get("/product/<product_id>")
def product_page(product_id):
    with connect() as db:
        item = db.execute("SELECT id,name,category,price,subtitle FROM products WHERE id=?", (product_id,)).fetchone()
    if not item:
        return shop_page("Товар не найден", "<h1>Товар не найден</h1>"), 404
    pid, name = html.escape(item["id"]), html.escape(item["name"])
    content = (f"<h1>{name}</h1><p>{html.escape(item['subtitle'])}</p><p>{item['price']} ₽</p>"
               f"<a href='/checkout?item={pid}'>Добавить в корзину и оформить</a>"
               "<h2>Предпросмотр предмета</h2><form action='/api/fetch' method='get'><label>Адрес превью <input name='url' value='http://127.0.0.1:5000/api/ssrf-fixture'></label><button>Загрузить</button></form>"
               f"<h2>Отзывы покупателей</h2><form action='/product/{pid}/review' method='post'><label>Имя <input name='author' value='Гость'></label>"
               "<label>Отзыв <input name='body' value='Понравился предмет'></label><button>Оставить отзыв</button></form>"
               "<h2>Текст открытки к заказу</h2><form action='/api/ssti' method='post'><label>Поздравление <input name='template' value='С заботой о доме'></label><button>Предпросмотр</button></form>")
    return shop_page(name, content)


@app.post("/product/<product_id>/review")
def product_review_page(product_id):
    data = request.form
    author, body = str(data.get("author", "Гость"))[:80], str(data.get("body", ""))[:500]
    # VULN W01-XSS CWE-79 BDU:W01 УБИ.041 — comment is reflected as raw HTML on this product page.
    return shop_page("Отзывы покупателей", "<h1>Отзыв добавлен</h1><article><b>" + author + "</b><p>" + body + "</p></article>"
                     + f"<a href='/product/{html.escape(product_id)}'>Вернуться к товару</a>")


@app.get("/profile")
def storefront_profile():
    content = ("<h1>Личный кабинет</h1><h2>Войти</h2><form action='/api/login' method='post'><label>Логин <input name='username' value='test'></label>"
               "<label>Пароль <input type='password' name='password' value='123456'></label><button>Войти</button></form>"
               "<h2>Новый покупатель</h2><form action='/api/register' method='post'><label>Логин <input name='username'></label>"
               "<label>Пароль <input type='password' name='password'></label><button>Создать аккаунт</button></form>"
               "<h2>Мои заказы</h2><ul><li><a href='/orders/3'>Заказ №3</a></li><li><a href='/orders/4'>Заказ №4</a></li></ul><p><a href='/api/visitor'>Сведения о сеансе доставки</a></p>"
               "<h2>Восстановить доступ</h2><form action='/api/reset' method='post'><label>Логин <input name='username' value='test'></label><button>Получить код</button></form>"
               "<h2>Адрес доставки</h2><form action='/api/address' method='post'><label>Адрес <input name='address' value='ул. Тестовая, 1'></label><button>Сохранить</button></form>"
               "<h2>Фото профиля</h2><form action='/api/upload' method='post' enctype='multipart/form-data'><label>Файл <input name='file' type='file'></label><button>Загрузить</button></form>"
               "<h2>Счёт-фактура</h2><form action='/api/file' method='get'><label>Номер файла <input name='path' value='invoice-1002.txt'></label><button>Открыть</button></form>")
    return shop_page("Личный кабинет", content)


@app.get("/orders/<int:order_id>")
def storefront_order(order_id):
    # VULN VC06 CWE-639 УБИ.067 — order page exposes a seeded order without owner authentication.
    with connect() as db:
        order = db.execute("SELECT id,customer_id,item,status,total FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        return shop_page("Заказ", "<h1>Заказ не найден</h1>"), 404
    return shop_page("Мои заказы", f"<h1>Заказ №{order['id']}</h1><p>Покупатель {order['customer_id']}</p>"
                     f"<p>{html.escape(order['item'])} · {html.escape(order['status'])} · {order['total']} ₽</p><a href='/checkout?item={order['id']}'>Повторить заказ</a>")


@app.get("/checkout")
def checkout_page():
    item = request.args.get("item", "chair-01")[:40]
    return shop_page("Оформление заказа", f"<h1>Оформление заказа</h1><form action='/api/pay' method='post'><input type='hidden' name='username' value='test'>"
                     f"<label>Товар <input name='item' value='{html.escape(item)}'></label><label>Сумма <input name='amount' value='24900'></label>"
                     "<label>Статус <input name='status' value='paid'></label><button>Оплатить</button></form>"
                     "<h2>Импорт адреса</h2><form action='/api/xxe' method='post'><label>XML <input name='xml' value='&lt;address&gt;Город-пример&lt;/address&gt;'></label><button>Импортировать</button></form>"
                     "<h2>Восстановить корзину</h2><form action='/api/deserialize' method='post'><label>Код корзины <input name='data' value='DEMO-CART-1002'></label><button>Загрузить корзину</button></form>")


@app.get("/delivery")
def delivery_page():
    return shop_page("Доставка", "<h1>Проверить доставку</h1><form action='/api/ping' method='get'><label>Адрес пункта <input name='host' value='127.0.0.1'></label><button>Проверить наличие</button></form>"
                     "<h2>Загруженность службы доставки</h2><form action='/api/load-sim' method='post'><label>Размер очереди <input name='requests' value='6'></label><button>Оценить время</button></form>"
                     "<h2>Поиск пункта выдачи</h2><form action='/api/dns-demo' method='get'><label>Город <input name='host' value='shop.lab'></label><button>Найти пункт</button></form>")


@app.get("/api/products")
def products():
    term = request.args.get("q", "")[:500]
    # VULN VC-W01-SQLI CWE-89 BDU:W01 УБИ.033 — string concatenation, synthetic SQLite only.
    sql = "SELECT id,name,category,price,color,subtitle,art FROM products WHERE name LIKE '%" + term + "%' OR category LIKE '%" + term + "%' ORDER BY rowid"
    try:
        with connect() as db:
            found = [dict(r) for r in db.execute(sql).fetchall()]
        return jsonify(products=found, count=len(found), lesson="Запрос собран конкатенацией; БД содержит только фиктивный каталог.")
    except sqlite3.Error as exc:
        return jsonify(products=[], count=0, error="Ошибка синтаксиса учебного запроса", detail=str(exc)), 400


@app.get("/api/dns-demo")
def dns_demo():
    # VULN W05-DNS CWE-349 BDU:W05 — synthetic answer only; no DNS lookup occurs.
    return jsonify(host=request.args.get("host", "shop.lab"), answer="203.0.113.42", note="Synthetic documentation address.")


@app.get("/api/reviews")
def get_reviews():
    return jsonify(reviews=[{"author": "Тестовый покупатель", "body": "Хорошее кресло!"}])


@app.post("/api/reviews")
def post_review():
    data = request_data()
    author, body = str(data.get("author", "Гость"))[:80], str(data.get("body", ""))[:500]
    # VULN W01-XSS CWE-79 BDU:W01 УБИ.041 — raw field returned for unsafe client-side display.
    return jsonify(review={"author": author, "body": body}, lesson="Учебное поле отражено без экранирования.")


@app.get("/api/account")
def account():
    try:
        cid = int(request.args.get("customer_id", "1001"))
        with connect() as db:
            rows = [dict(r) for r in db.execute("SELECT id,item,status,total FROM orders WHERE customer_id=?", (cid,))]
        # VULN VC06 CWE-639 УБИ.067 — object lookup accepts arbitrary customer id.
        return jsonify(customer_id=cid, orders=rows, lesson="Владелец заказа не сверяется с учётной записью.")
    except ValueError:
        return jsonify(error="Нужен числовой идентификатор"), 400


@app.get("/api/orders/<int:order_id>")
def order_by_id(order_id):
    # VULN VC06 CWE-639 УБИ.067 — direct object reference without ownership check.
    with connect() as db:
        row = db.execute("SELECT id,customer_id,item,status,total FROM orders WHERE id=?", (order_id,)).fetchone()
    return (jsonify(order=dict(row), lesson="Идентификатор заказа не связан с владельцем."), 200) if row else (jsonify(error="Заказ не найден"), 404)


@app.get("/api/profile")
def profile():
    # VULN VC06 CWE-639 УБИ.067 — fixed test identity and its seeded orders are returned without session binding.
    with connect() as db:
        orders = [dict(r) for r in db.execute("SELECT id,item,status,total FROM orders WHERE customer_id=1002")]
    return jsonify(username="test", name="Тестовый покупатель", city="Город-пример", address="ул. Тестовая, 1", orders=orders)


@app.post("/api/register")
def register():
    # VULN W04-REG CWE-521 BDU:W04 — permissive demo validation; no inputs are persisted.
    data = request_data()
    username, password = str(data.get("username", ""))[:40], str(data.get("password", ""))[:80]
    return jsonify(ok=bool(username and password), username=username, saved=False,
                   message="Регистрация только симулирована; введённые данные не сохраняются.")


@app.post("/api/login")
def login():
    data = request_data()
    username, password = str(data.get("username", ""))[:80], str(data.get("password", ""))[:120]
    # VULN VC04 CWE-307 УБИ.008 — no attempt limit; VC05 CWE-348 УБИ.008 trusts spoofable X-Forwarded-For.
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    with connect() as db:
        row = db.execute("SELECT username FROM users WHERE username=? AND password=?", (username, password)).fetchone()
    if row:
        return jsonify(ok=True, user=username, client_ip=ip, message="Демо-вход; данные вымышлены.")
    return jsonify(ok=False, client_ip=ip, message="Вход не выполнен; ограничителя попыток нет."), 401


@app.get("/api/visitor")
def visitor():
    # VULN VC05 CWE-348 УБИ.008 — X-Forwarded-For is client-controlled without trusted proxy validation.
    return jsonify(client_ip=request.headers.get("X-Forwarded-For", request.remote_addr))


@app.post("/api/address")
def change_address():
    # VULN VC09 CWE-352 УБИ.042 — state-changing endpoint has no CSRF token.
    data = request_data()
    return jsonify(ok=True, address=str(data.get("address", ""))[:160], lesson="Изменение принято без CSRF-проверки.")


@app.post("/api/pay")
def pay():
    data = request_data()
    # Keep scanner fuzzing inside the lab: malformed values are accepted as a fake zero receipt,
    # while a valid client-supplied amount is still trusted (the lesson is VC07).
    try:
        amount = int(str(data.get("amount", 0) or 0)[:16])
    except (TypeError, ValueError):
        amount = 0
    amount = max(-1_000_000, min(amount, 1_000_000))
    status = str(data.get("status", "paid"))[:30]
    username = str(data.get("username", "test"))[:80]
    # VULN VC07 CWE-602 УБИ.033 — trusts client-supplied price and payment status; writes fake local receipt only.
    with connect() as db:
        cur = db.execute("INSERT INTO payments (username,amount,status) VALUES (?,?,?)", (username, amount, status))
        receipt = cur.lastrowid
    return jsonify(ok=True, receipt=receipt, amount=amount, status=status, lesson="Чек учебный; подтверждение оплаты не выполняется.")


@app.get("/api/fetch")
def local_fetch():
    # VULN VC08 CWE-918 УБИ.068 — server-side URL fetch; deliberately constrained to this app's localhost fixture.
    raw = request.args.get("url", "")
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost") or parsed.port != PORT or parsed.path != "/api/ssrf-fixture":
        return jsonify(error="Для учебной безопасности разрешён только http://127.0.0.1:5000/api/ssrf-fixture"), 400
    try:
        with urllib.request.urlopen(raw, timeout=0.8) as response:  # bounded localhost-only request; never follows to third-party hosts
            body = response.read(MAX_BYTES).decode("utf-8", "replace")
        return jsonify(url=raw, fetched=body[:MAX_BYTES], note="Запрос ушёл только на localhost.")
    except (OSError, urllib.error.URLError) as exc:
        return jsonify(error="Локальная фикстура недоступна", detail=str(exc)[:200]), 502


@app.get("/api/ssrf-fixture")
def ssrf_fixture():
    return jsonify(marker="LOCAL_FIXTURE_ONLY", message="Фиктивная внутренняя заметка магазина.")


@app.get("/api/ping")
def ping_demo():
    target = request.args.get("host", "127.0.0.1")[:256]
    # VULN W01-CMDI CWE-78 BDU:W01 УБИ.068 — command-like input; simulated only, no shell/subprocess.
    marker = "INJECTION_MARKER" if any(x in target for x in (";", "&&", "|", "`", "$")) else None
    return jsonify(input=target, output=("echo " + target)[:512], simulated=True, marker=marker,
                   note="Никакая системная команда не запускается; безопасная echo-симуляция.")


@app.post("/api/ssti")
def ssti_demo():
    text = str(request_data().get("template", ""))[:1024]
    # VULN W01-SSTI CWE-1336 BDU:W01 — marker recognition only; no template evaluation.
    return jsonify(input=text, marker="SSTI_MARKER" if "{{" in text else None,
                   output="TEMPLATE_MARKER_ONLY", evaluated=False)


@app.post("/api/xxe")
def xxe_demo():
    payload = str(request_data().get("xml", request.get_data(cache=False)[:MAX_BYTES].decode("utf-8", "replace")))[:MAX_BYTES]
    # VULN W01-XXE CWE-611 BDU:W01 — reports marker, does not resolve entities or parse XML.
    return jsonify(marker="XXE_MARKER" if "DOCTYPE" in payload.upper() or "ENTITY" in payload.upper() else None,
                   parsed=False, note="XML-парсер и внешние сущности не запускаются.")


@app.post("/api/deserialize")
def deserialize_demo():
    blob = str(request_data().get("data", ""))[:4096]
    # VULN W03-DESERIALIZE CWE-502 BDU:W03 — detector marker only; pickle/marshal/eval are never called.
    return jsonify(marker="SERIALIZATION_MARKER" if blob else None, deserialized=False)


@app.get("/api/file")
def file_demo():
    path = request.args.get("path", "catalog.txt")[:256].replace("\\", "/")
    # VULN W02-FILE CWE-22 BDU:W02 — deliberately fixed to /etc/passwd, never accepts arbitrary filesystem paths.
    if path in ("/etc/passwd", "../../etc/passwd", "../../../etc/passwd"):
        try:
            with open("/etc/passwd", "r", encoding="utf-8", errors="replace") as handle:
                return jsonify(path=path, content=handle.read(4096), note="Демонстрация ограничена локальным /etc/passwd.")
        except OSError:
            return jsonify(path=path, content="LOCAL_PASSWD_FIXTURE:demo:x:1000:1000:fake:/home/demo:/bin/false")
    fixtures = {"catalog.txt": "Фиктивный каталог Forma", "invoice-1002.txt": "FAKE_ORDER=1002\nITEM=Aster Lounge Chair\nTOTAL=24900", "../private/notes.txt": "FAKE_DEMO_NOTE=LAB-ONLY-42"}
    return jsonify(path=path, content=fixtures.get(path, "Файл не найден в учебной карте."))


@app.post("/api/reset")
def reset_demo():
    # VULN VC11 CWE-330 УБИ.008 — deliberately predictable non-cryptographic token; fake account only.
    token = str(random.randint(100000, 999999))
    return jsonify(token=token, note="Учебный код сброса; пароль и учётная запись не меняются.")


@app.post("/api/load-sim")
def load_sim():
    data = request_data()
    # VULN W05-DOS CWE-400 BDU:W05 — demonstrates rate limiting with max 20 fake requests and no network load.
    try:
        requested = int(str(data.get("requests", 1))[:16])
    except (TypeError, ValueError):
        requested = 1
    count = max(1, min(requested, 20))
    protected = bool(data.get("protected", False))
    return jsonify(requested=count, accepted=min(count, 5) if protected else count,
                   blocked=max(0, count - 5) if protected else 0,
                   note="Только арифметическая симуляция; трафик не генерируется.")


@app.post("/api/regex-demo")
def regex_demo():
    text = str(request_data().get("text", ""))[:MAX_BYTES]
    # VULN W05-REDOS CWE-1333 BDU:W05 — bounded stand-in, safe regex, <=1 MB and fixed tiny work budget.
    started = time.monotonic()
    re.search(r"a+b", text[:4096])
    elapsed = min(time.monotonic() - started, 0.05)
    return jsonify(length=len(text), elapsed_ms=round(elapsed * 1000, 3), simulated=True, max_input=MAX_BYTES)


@app.post("/api/upload")
def upload_demo():
    # VULN W05-UPLOAD CWE-434 BDU:W05 — accepts arbitrary extensions, but saves only as inert data under uploads/.
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify(error="Ожидался файл в поле file"), 400
    name = secure_filename(uploaded.filename or "upload.bin")[:120] or "upload.bin"
    content = uploaded.stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        return jsonify(error="Файл больше 1 МБ"), 413
    destination = UPLOADS / (f"{int(time.time() * 1000)}_{name}")
    destination.write_bytes(content)
    return jsonify(filename=name, bytes=len(content), stored=True, executed=False)


@app.get("/api/config")
def config_demo():
    # VULN VC12 CWE-489 УБИ.169 — debug mode is enabled only on the forced loopback listener.
    # FAKE detector sample. This value is never sent to a real provider.
    fake_secret = "sk_live_FAKExxxxxxxxxxxxxxxxxxxx"
    return jsonify(debug=app.debug, fake_secret=fake_secret, cors="*", headers="CSP and X-Frame-Options absent")


@app.get("/api/hidden")
def hidden():
    route = request.args.get("route", "").strip("/")
    # VULN VC12 CWE-489 УБИ.169 — exposed test/phpinfo route fixture, PHP is not installed or executed.
    entries = {"admin-preview": "FAKE ADMIN PREVIEW", "backup-old": "FAKE BACKUP INDEX", "test.php": "PHPINFO_MARKER (static text only)"}
    return (jsonify(route=route, result=entries[route]), 200) if route in entries else (jsonify(error="Не найдено"), 404)


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error="Запрос ограничен размером 1 МБ"), 413


if __name__ == "__main__":
    init_db()
    print(f"УЧЕБНЫЙ стенд слушает только http://{HOST}:{PORT}")
    # VULN VC12 CWE-489 УБИ.169 — Flask debug intentionally on for the local lab; do not change host/bind.
    app.run(host=HOST, port=PORT, debug=True, threaded=True, use_reloader=False)
