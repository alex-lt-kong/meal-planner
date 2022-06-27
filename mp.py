#!/usr/bin/python3

from flask import Flask, render_template, Response, request, redirect, session
from flask_cors import CORS
from PIL import Image
from sqlalchemy.sql import select
from sqlalchemy import create_engine
from sqlalchemy import MetaData, Table
from sqlalchemy import func
from waitress import serve

import click
import datetime as dt
import flask
import hashlib
import importlib.machinery as im
import json
import logging
import numpy as np
import os
import pymysql
import random
import re
import signal
import sqlalchemy
import sys
import threading

app = Flask(__name__)
app.secret_key = b''
app.config.update(
    MAX_CONTENT_LENGTH=1,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

CORS(app)
#  This necessary for javascript to access a telemetry link without opening it:
#  https://stackoverflow.com/questions/22181384/javascript-no-access-control-allow-origin-header-is-present-on-the-requested

allowed_ext = None
app_name = 'meal-planner'
# app_address: the app's address on the Internet
app_address = ''
# app_dir: the app's real address on the filesystem
app_dir = os.path.dirname(os.path.realpath(__file__))
attachments_path = os.path.join(app_dir, 'resources/attachments')
blacklist_path = os.path.join(app_dir, 'blacklist.json')
debug_mode = False
db_url, db_username, db_password, db_name = '', '', '', ''
external_script_dir = ''
loader = im.SourceFileLoader('emailer', f'{app_dir}/../emailer/emailer.py')
emailer = loader.load_module()
log_path = ''
selfies_path = os.path.join(app_dir, 'resources/selfies')
settings_path = os.path.join(app_dir, 'settings.json')
stop_signal = False
users_path = os.path.join(app_dir, 'users.json')


@app.route('/get-attachments-list/', methods=['GET'])
def get_attachment_list():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)
    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('未指定参数date', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response('参数date的语法不正确', 400)

    data = {}
    data['metadata'] = {}
    data['metadata']['date'] = date_string
    data['metadata']['username'] = username
    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today):
        data['filenames'] = os.listdir(attachments_path_today)
    else:
        data['filenames'] = None

    return flask.jsonify(data)


@app.route('/rename-attachment/', methods=['GET'])
def rename_attachment():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)
    if ('date' in request.args
            and 'filename_old' in request.args
            and 'filename_new' in request.args):
        date_string = request.args['date']
        filename_old = request.args['filename_old']
        filename_old = sanitize_filename(filename_old)
        filename_new = request.args['filename_new']
        filename_new = sanitize_filename(filename_new)
    else:
        return Response('未指定参数date,filename_old或filename_new', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        return Response('参数date的语法不正确', 400)

    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today) is False:
        return Response(f'文件{filename_old}不存在', 400)

    file_path_old = os.path.join(attachments_path_today, filename_old)
    if os.path.isfile(file_path_old) is False:
        return Response(f'文件{filename_old}不存在', 400)
    file_path_new = os.path.join(attachments_path_today, filename_new)
    try:
        os.rename(file_path_old, file_path_new)
    except Exception as e:
        logging.exception('')
        return Response(f'文件{filename_old}重命名为{filename_new}失败', 500)
    return Response(f'文件{filename_old}重命名为{filename_new}成功！', 200)


@app.route('/remove-attachment/', methods=['GET'])
def remove_attachment():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)
    if 'date' in request.args and 'filename' in request.args:
        date_string = request.args['date']
        filename = request.args['filename']
        filename = sanitize_filename(filename)
    else:
        return Response('未指定参数date或filename', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response('参数date的语法不正确', 400)

    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today) is False:
        return Response(f'文件{filename}不存在', 400)
    file_path = os.path.join(attachments_path_today, filename)
    if os.path.isfile(file_path) is False:
        return Response(f'文件{filename}不存在', 400)

    try:
        os.remove(file_path)
    except Exception:
        logging.exception('')
        return Response(f'文件{filename}删除失败', 500)
    return Response(f'文件{filename}删除成功', 200)


@app.route('/get-attachment/', methods=['GET'])
def get_attachment():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)
    if 'date' in request.args and 'filename' in request.args:
        date_string = request.args['date']
        filename = request.args['filename']
        filename = sanitize_filename(filename)
    else:
        return Response('未指定参数date或filename', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response('参数date的语法不正确', 400)

    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today) is False:
        return Response(f'文件[{filename}]不存在', 400)
    file_path = os.path.join(attachments_path_today, filename)
    if os.path.isfile(file_path) is False:
        return Response(f'文件[{filename}]不存在', 400)

    return flask.send_from_directory(directory=attachments_path_today,
                                     filename=filename,  as_attachment=False,
                                     attachment_filename=filename)


def sanitize_filename(filename):
    # This function may be not robust enough... but should be good enough
    # for this use case...
    # also, the security is enhanced by the use of send_from_directory()
    error_set = ['/', '\\', ':', '*', '?', '"', '|', '<', '>', ' ']
    for c in filename:
        if c in error_set:
            filename = filename.replace(c, '_')
    if len(filename) > 64:
        filename = filename[:31] + '__' + filename[-31:]
    return filename


@app.route('/upload-attachment/', methods=['POST'])
def upload_attachment():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'selected_file' not in request.files:
        return Response('没有收到附件', 400)
    if request.files['selected_file'] is None:
        return Response('没有收到附件', 400)

    selected_file = request.files['selected_file']

    filename_parts = selected_file.filename.rsplit('.', 1)
    if (len(filename_parts) > 1 and
            filename_parts[1].lower() not in allowed_ext):
        # len(filename_parts) == 1 -> a file without an extension
        return Response(f'仅允许上传后缀为{allowed_ext}的文件', 400)

    date_string = dt.datetime.now().strftime('%Y-%m-%d')
    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today) is False:
        try:
            os.mkdir(attachments_path_today)
        except Exception as e:
            logging.exception('')
            return Response('无法创建文件', 500)

    filename = sanitize_filename(selected_file.filename)
    selected_file.seek(0)
    selected_file.save(os.path.join(attachments_path_today, filename))

    return Response('附件上传成功', 200)


@app.route('/upload-selfie/', methods=['POST'])
def upload_selfie():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'selected_file' not in request.files:
        return Response('没有收到自拍图', 400)
    if request.files['selected_file'] is None:
        return Response('没有收到自拍图', 400)

    selected_file = request.files['selected_file']

    if selected_file.filename.rsplit('.', 1)[1].lower() not in allowed_ext:
        return Response(f'仅允许上传后缀为{allowed_ext}的文件', 400)

    date_string = dt.datetime.now().strftime('%Y-%m-%d')

    oldext = os.path.splitext(selected_file.filename)[1]
    for ext in allowed_ext:
        image_path = os.path.join(selfies_path, f'{date_string}.{ext}')
        if os.path.isfile(image_path):
            os.remove(image_path)

    filename = f'{date_string}{oldext}'
    selected_file.seek(0)
    try:
        image = Image.open(selected_file).convert('RGB')
        image.thumbnail((1024, 1024))
        # (800, 800): the maximum width and maximum height of the thumbnail
        image.save(os.path.join(selfies_path, filename))
    except Exception:
        logging.exception('')
        return Response('自拍图保存错误', 500)

    return Response('自拍照上传成功', 200)


@app.route('/get-selfie/', methods=['GET'])
def get_selfie():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('未指定参数date', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response('参数date的语法不正确', 400)

    for ext in allowed_ext:
        image_path = os.path.join(selfies_path, f'{date_string}.{ext}')
        if os.path.isfile(image_path):
            return flask.send_from_directory(directory=selfies_path,
                                             filename=f'{date_string}.{ext}',
                                             as_attachment=False)

    return Response('未找到该日期的自拍图', 404)


@app.route('/update-blacklist/', methods=['POST'])
def update_blacklist():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'data' not in request.form:
        return Response('未指定参数data', 400)

    data = request.form['data']
    try:
        json_data = json.loads(data)
    except Exception:
        logging.exception('')
        return Response('data的值无法解析成JSON字符串', 400)
    if 'banned_items' not in json_data or 'limited_items' not in json_data:
        return Response(f'JSON数据[{json_data}]格式错误', 400)

    try:
        with open(blacklist_path, 'w+') as json_file:
            json.dump(json_data, json_file,
                      sort_keys=True, indent=4, ensure_ascii=False)
    except Exception:
        logging.exception('')
        return Response('黑名单写入错误', 500)

    return Response('黑名单更新成功！', 200)


@app.route('/get-blacklist/', methods=['GET'])
def get_blacklist():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)

    try:
        with open(blacklist_path, 'r') as json_file:
            json_str = json_file.read()
            blacklist = json.loads(json_str)
    except Exception:
        logging.exception('')
        return Response('读取黑名单错误', 500)

    blacklist['metadata'] = {}
    blacklist['metadata']['username'] = username
    blacklist['metadata']['date'] = dt.datetime.now().strftime('%Y-%m-%d')

    return flask.jsonify(blacklist)


@app.route('/get-all-attachments/', methods=['GET'])
def get_all_attachments():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)
    attachments = {
        'data': []
    }
    try:

        for root, dirs, files in os.walk(attachments_path):
            for filename in files:
                attachments['data'].append({
                    'date': root[len(attachments_path) + 1:],
                    'filename': filename
                })
    except Exception:
        logging.exception('')
        return Response('读取附件列表错误', 500)

    attachments['metadata'] = {}
    attachments['metadata']['username'] = username
    return flask.jsonify(attachments)


@app.route('/get-username/', methods=['GET'])
def get_username():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)

    return flask.jsonify({'username': username})


@app.route('/logout/')
def logout():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
        session[app_name].pop(f'{username}_last_reminder', None)

    if app_name in session:
        session[app_name].pop('username', None)

    return redirect(f'{app_address}/')


@app.before_request
def make_session_permanent():
    session.permanent = True
    app.permanent_session_lifetime = dt.timedelta(days=365)


@app.route('/login/', methods=['GET', 'POST'])
def login():

    if app_name in session and 'username' in session[app_name]:
        return redirect(f'{app_address}/')

    if request.method == 'POST':
        try:
            with open(users_path, 'r') as json_file:
                json_str = json_file.read()
                json_data = json.loads(json_str)
        except Exception as e:
            return render_template('login.html', message=f'{e}')
        if request.form['username'] not in json_data['users']:
            return render_template('login.html', message='用户名或密码错误')
        password = request.form['password'].encode('utf-8')
        if (hashlib.sha256(password).hexdigest()
                != json_data['users'][request.form['username']]):
            return render_template('login.html', message='用户名或密码错误')
        session[app_name] = {}
        session[app_name]['username'] = request.form['username']

        return redirect(f'{app_address}/')

    return render_template('login.html', message='')


def write_meal_plan_to_db(json_data, date_string):

    conn_str = (f'mysql+pymysql://{db_username}:{db_password}@'
                f'{db_url}/{db_name}')
    engine = create_engine(conn_str)

    # Reflection - may have performance issues if done each time.
    # But let's make everything work before optimizing it!
    metadata = MetaData(bind=engine)
    mp = Table('meal_plan', metadata, autoload_with=engine)

    with engine.begin() as conn:
        # begin() starts a transaction
        d = mp.delete(mp.c.date == date_string)
        conn.execute(d)
        i = mp.insert().values(
            date=date_string,
            breakfast=json_data['breakfast']['content'],
            breakfast_feedback=json_data['breakfast']['feedback'],
            morning_extra_meal=json_data['morning_extra_meal']['content'],
            morning_extra_meal_feedback=json_data[
                'morning_extra_meal']['feedback'],
            lunch=json_data['lunch']['content'],
            lunch_feedback=json_data['lunch']['feedback'],
            afternoon_extra_meal=json_data['afternoon_extra_meal']['content'],
            afternoon_extra_meal_feedback=json_data[
                'afternoon_extra_meal']['feedback'],
            dinner=json_data['dinner']['content'],
            dinner_feedback=json_data['dinner']['feedback'],
            evening_extra_meal=json_data['evening_extra_meal']['content'],
            evening_extra_meal_feedback=json_data[
                'evening_extra_meal']['feedback'],
            daily_remark=json_data['remark']['content'])
        conn.execute(i)


@app.route('/update-meal-plan/', methods=['POST'])
def update_meal_plan():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'date' not in request.form or 'data' not in request.form:
        return Response('未指定参数date或data', 400)
    date_str = request.form['date']
    data = request.form['data']

    try:
        date = dt.datetime.strptime(date_str, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response(f'date的值[{date_str}]不正确', 400)
    if abs((dt.datetime.now() - date).days) > 2:
        return Response(f'date的值[{date}]超过允许的范围', 400)
    try:
        json_data = json.loads(data)
    except Exception:
        logging.exception('')
        return Response('data的值无法解析成JSON字符串', 400)

    logging.debug(f'raw string submitted by client: [{json_data}]')

    try:
        write_meal_plan_to_db(json_data, date)
    except Exception:
        logging.exception('')
        return Response('写入数据库失败', 500)

    return Response(f'更新{date}食谱成功！', 200)


def insert_modification_type(meal_plan):

    # type == 0: no modification
    # type == 1: safe modification
    # type == 2: dangerous modification

    items = ['breakfast', 'morning_extra_meal',
             'lunch', 'afternoon_extra_meal',
             'dinner', 'evening_extra_meal', 'remark']

    re_str = r'(-?\d*\.?\d+)'
    res_old, res_new = {}, {}
    for item in items:
        # Iterate meals, not days
        meal_plan[item]['modification_type'] = 0

        if len(meal_plan[item]['content']) > 0:
            res_new[item] = re.split(re_str, meal_plan[item]['content'])[2:]
        else:
            res_new[item] = []
        if len(meal_plan[item]['prev']) > 0:
            res_old[item] = re.split(re_str, meal_plan[item]['prev'])[2:]
        else:
            res_old[item] = []
        # The 1st element from this flawed regex split is a space
        # The 2nd element is the timestamp

        if len(res_old[item]) != len(res_new[item]):
            meal_plan[item]['modification_type'] = 2
        else:
            for j in range(len(res_old[item])):
                if res_old[item][j] != res_new[item][j]:
                    try:
                        f1 = float(res_old[item][j])
                        f2 = float(res_new[item][j])
                        if f2 > f1:
                            meal_plan[item]['modification_type'] = 2
                        elif meal_plan[item]['modification_type'] == 0:
                            meal_plan[item]['modification_type'] = 1
                    except Exception as e:
                        logging.debug(
                            f'{e}: '
                            f'{res_old[item][j]}, {res_new[item][j]}')
                        meal_plan[item]['modification_type'] = 2
                        break
    return meal_plan


def read_meal_plan_from_db(date_string: str):

    conn_str = (f'mysql+pymysql://{db_username}:{db_password}@'
                f'{db_url}/{db_name}')
    engine = create_engine(conn_str)

    # Reflection - may have performance issues if done each time.
    # But let's make everything work before optimizing it!
    metadata = MetaData(bind=engine)
    mp = Table('meal_plan', metadata, autoload_with=engine)

    s = select([mp]).where(mp.columns.date == date_string)
    with engine.begin() as conn:
        result = conn.execute(s).one()

    return result


def insert_previous_plan(meal_plan):

    today = dt.datetime.strptime(meal_plan['metadata']['date'], '%Y-%m-%d')
    yesterday = today - dt.timedelta(days=1)

    try:
        res = read_meal_plan_from_db(dt.datetime.strftime(yesterday,
                                                          '%Y-%m-%d'))
        meal_plan['breakfast']['prev'] = res['breakfast']
        meal_plan['morning_extra_meal']['prev'] = res['morning_extra_meal']
        meal_plan['lunch']['prev'] = res['lunch']
        meal_plan['afternoon_extra_meal']['prev'] = res['afternoon_extra_meal']
        meal_plan['dinner']['prev'] = res['dinner']
        meal_plan['evening_extra_meal']['prev'] = res['evening_extra_meal']
        meal_plan['remark']['prev'] = res['daily_remark']
    except sqlalchemy.exc.NoResultFound:
        meal_plan['breakfast']['prev'] = ''
        meal_plan['morning_extra_meal']['prev'] = ''
        meal_plan['lunch']['prev'] = ''
        meal_plan['afternoon_extra_meal']['prev'] = ''
        meal_plan['dinner']['prev'] = ''
        meal_plan['evening_extra_meal']['prev'] = ''
        meal_plan['remark']['prev'] = ''

    return meal_plan


def convert_meal_plan_to_json(date_string: str):

    # content and feedback should be set to '' instead of None
    # so that len() will always work.
    mp = {}
    mp['metadata'] = {}
    mp['metadata']['date'] = date_string
    mp['breakfast'] = {}
    mp['breakfast']['title'] = '早餐'
    mp['morning_extra_meal'] = {}
    mp['morning_extra_meal']['title'] = '上午加餐'
    mp['lunch'] = {}
    mp['lunch']['title'] = '午餐'
    mp['afternoon_extra_meal'] = {}
    mp['afternoon_extra_meal']['title'] = '下午加餐'
    mp['dinner'] = {}
    mp['dinner']['title'] = '晚餐'
    mp['evening_extra_meal'] = {}
    mp['evening_extra_meal']['title'] = '晚上加餐'
    mp['remark'] = {}

    try:
        res = read_meal_plan_from_db(date_string)

        mp['breakfast']['content'] = res['breakfast']
        mp['breakfast']['feedback'] = res['breakfast_feedback']
        mp['morning_extra_meal']['content'] = res['morning_extra_meal']
        mp['morning_extra_meal'][
            'feedback'] = res['morning_extra_meal_feedback']
        mp['lunch']['content'] = res['lunch']
        mp['lunch']['feedback'] = res['lunch_feedback']
        mp['afternoon_extra_meal'][
            'content'] = res['afternoon_extra_meal']
        mp['afternoon_extra_meal'][
            'feedback'] = res['afternoon_extra_meal_feedback']
        mp['dinner']['content'] = res['dinner']
        mp['dinner']['feedback'] = res['dinner_feedback']
        mp['evening_extra_meal']['content'] = res['evening_extra_meal']
        mp['evening_extra_meal'][
            'feedback'] = res['evening_extra_meal_feedback']
        mp['remark']['content'] = res['daily_remark']
    except sqlalchemy.exc.NoResultFound:
        mp['breakfast']['content'] = ''
        mp['breakfast']['feedback'] = ''
        mp['morning_extra_meal']['content'] = ''
        mp['morning_extra_meal']['feedback'] = ''
        mp['lunch']['content'] = ''
        mp['lunch']['feedback'] = ''
        mp['afternoon_extra_meal']['content'] = ''
        mp['afternoon_extra_meal']['feedback'] = ''
        mp['dinner']['content'] = ''
        mp['dinner']['feedback'] = ''
        mp['evening_extra_meal']['content'] = ''
        mp['evening_extra_meal']['feedback'] = ''
        mp['remark']['content'] = ''

    mp = insert_previous_plan(mp)
    mp = insert_modification_type(mp)

    return mp


@app.route('/get-meal-plan/', methods=['GET'])
def get_meal_plan():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)

    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('未指定参数date', 400)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception:
        logging.exception('')
        return Response('参数date的语法不正确', 400)

    try:
        meal_plan = convert_meal_plan_to_json(date_string)
        meal_plan['metadata']['username'] = username
    except Exception:
        logging.exception('')
        return Response('内部错误', 500)

    logging.debug(f'meal_plan to be sent to client: {meal_plan}')

    return flask.jsonify(meal_plan)


@app.route('/get-history-notes/', methods=['GET'])
def get_history_notes():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return redirect(f'{app_address}/login/')

    conn_str = (f'mysql+pymysql://{db_username}:{db_password}@'
                f'{db_url}/{db_name}')
    engine = create_engine(conn_str)

    # Reflection - may have performance issues if done each time.
    # But let's make everything work before optimizing it!
    metadata = MetaData(bind=engine)
    notes = Table('notes', metadata, autoload_with=engine)

    s = select([notes.c.date, notes.c.content]).order_by(notes.c.date.asc())
    with engine.begin() as conn:
        result = conn.execute(s).fetchall()
        # If you fetchall(), the result is a list
        # If you just execute(), the result is a ResultProxy object
        # which has to be iterated to get a list.

    dicts = []
    # There is one more difficulty in making this iteration into list
    # comprehension...I need to pass two parameters, i.e., row and username
    # to the function. But username per se is a string, which can not be
    # iterated without extra treatment...
    for row in result:
        d = {}
        d['metadata'] = {}
        d['metadata']['date'] = dt.datetime.strftime(row['date'], '%Y-%m-%d')
        d['metadata']['username'] = username
        d['content'] = row['content']

        dicts.append(d)

    return flask.jsonify(dicts)


def convert_notes_to_json():

    conn_str = (f'mysql+pymysql://{db_username}:{db_password}@'
                f'{db_url}/{db_name}')
    engine = create_engine(conn_str)

    # Reflection - may have performance issues if done each time.
    # But let's make everything work before optimizing it!
    metadata = MetaData(bind=engine)
    notes = Table('notes', metadata, autoload_with=engine)

    notes_json = {}
    try:
        s = select(func.max(notes.c.date))
        with engine.begin() as conn:
            max_date = conn.execute(s).scalar()

        s = (select([notes.c.date, notes.c.content])
             .where(notes.c.date == max_date))
        with engine.begin() as conn:
            result = conn.execute(s).one()
    except sqlalchemy.exc.NoResultFound:
        # This exception is acceptable if the database is empty.
        # Other exceptions will be caught at a higher level
        notes_json['date'], notes_json['content'] = '', ''
    else:
        notes_json['date'] = result['date']
        notes_json['content'] = result['content']

    return notes_json


@app.route('/get-notes/', methods=['GET'])
def get_notes():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)

    try:
        notes_json = convert_notes_to_json()
    except Exception:
        logging.exception('')
        return Response('数据读取错误', 500)
    else:
        notes_json['metadata'] = {}
        notes_json['metadata']['date'] = notes_json['date']
        notes_json['metadata']['username'] = username

    return flask.jsonify(notes_json)


@app.route('/update-notes/', methods=['POST'])
def update_notes():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    if 'data' not in request.form or len(request.form['data']) == 0:
        return Response('没有收到数据', 400)
    data = request.form['data']
    try:
        json_data = json.loads(data)
    except Exception:
        logging.exception('')
        return Response('data的值无法解析成JSON字符串', 400)

    conn_str = (f'mysql+pymysql://{db_username}:{db_password}@'
                f'{db_url}/{db_name}')
    engine = create_engine(conn_str)

    # Reflection - may have performance issues if done each time.
    # But let's make everything work before optimizing it!
    metadata = MetaData(bind=engine)
    notes = Table('notes', metadata, autoload_with=engine)

    try:
        with engine.begin() as conn:
            # begin() starts a transaction
            # without conn.begin() it is still a transaction
            today = dt.date.today()
            d = notes.delete(notes.c.date == today)
            conn.execute(d)
            i = notes.insert().values(date=today,
                                      content=json_data['content'])
            conn.execute(i)
    except Exception:
        logging.exception('')
        return Response('笔记更新失败', 500)

    return Response('笔记更新成功', 200)


@app.route('/', methods=['GET'])
def index():
    # Render all pages (except login.html) at root dir to avoid
    # the difference of relative URLs.
    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return redirect(f'{app_address}/login/')

    kwargs = {
        'username': username,
        'app_address': app_address,
        'mode': 'dev' if debug_mode else 'prod',
        'external_script_dir': external_script_dir
    }

    if 'page' not in request.args:
        return render_template(
            'index.html',
            **kwargs
        )
    page = request.args['page']
    if page == 'history-selfies':
        return render_template('history-selfies.html', **kwargs)
    if page == 'history-notes':
        return render_template('history-notes.html', **kwargs)
    if page == 'history-attachments':
        return render_template('history-attachments.html', **kwargs)
    return render_template('index.html', **kwargs)


@app.route('/get-reminder-message/', methods=['GET'])
def get_reminder_message():

    if app_name in session and 'username' in session[app_name]:
        pass
    else:
        return Response('未登录', 401)

    try:
        with open(settings_path, 'r') as json_file:
            json_str = json_file.read()
            json_data = json.loads(json_str)
        data = {}
        data['frequency'] = json_data['reminder']['frequency']
        rand_idx = random.randrange(len(json_data['reminder']['messages']))
        data['message'] = json_data['reminder']['messages'][rand_idx]
    except Exception:
        logging.exception('')
        return Response('解析JSON文件失败', 500)

    if random.uniform(0, 1) > data['frequency']:
        data['message'] = ''

    return flask.jsonify(data)


@app.route('/get-daily-a-count/', methods=['GET', 'POST'])
def get_daily_a_count():

    if app_name in session and 'username' in session[app_name]:
        username = session[app_name]['username']
    else:
        return Response('未登录', 401)

    def moving_average(a, n=3):
        ret = np.cumsum(a, dtype=float)
        ret[n:] = ret[n:] - ret[:-n]
        return (ret[n - 1:] / n).tolist()
    try:
        days = int(request.args['days'])
    except Exception:
        days = 121
    if days < 14 or days > 65535:
        days = 121

    data = {
        'date': [],
        'value': []
    }
    conn = None
    try:
        conn = pymysql.connect(host=db_url, user=db_username, password=db_password, database=db_name)

        with conn.cursor() as cursor:
            sql = '''
    SELECT
        date,
        @breakfast_is_a := (CASE WHEN (breakfast_feedback = 'A' OR breakfast_feedback LIKE 'A %') THEN 1 ELSE 0 END) as breakfast_feedback,
        @morning_extra_meal_is_a := (CASE WHEN (morning_extra_meal_feedback = 'A' OR morning_extra_meal_feedback LIKE 'A %') THEN 1 ELSE 0 END) AS morning_extra_meal_feedback,
        @lunch_is_a := (CASE WHEN (lunch_feedback = 'A' OR lunch_feedback LIKE 'A %') THEN 1 ELSE 0 END) AS lunch_feedback,
        @afternoon_extra_meal_is_a := (CASE WHEN (afternoon_extra_meal_feedback = 'A' OR afternoon_extra_meal_feedback LIKE 'A %')THEN 1 else 0 END) AS afternoon_extra_meal_feedback,
        @dinner_is_a := (CASE WHEN (dinner_feedback = 'A' OR dinner_feedback LIKE 'A %') then 1 ELSE 0 END) AS dinner_feedback,
        @evening_extra_meal_is_a := (CASE WHEN (evening_extra_meal_feedback = 'A' OR evening_extra_meal_feedback LIKE 'A %') THEN 1 ELSE 0 END) AS evening_extra_meal_feedback,
        @breakfast_is_a + @morning_extra_meal_is_a + @lunch_is_a + @afternoon_extra_meal_is_a + @dinner_is_a + @evening_extra_meal_is_a AS a_count
    FROM `meal_plan`
    ORDER BY `meal_plan`.`date`  DESC LIMIT 1, 
            ''' + str(days)
            # It is guaranteed that days is an integer, so no risk of SQL injection
            cursor.execute(sql)
            result = cursor.fetchall()
            for item in result:
                data['date'].append(item[0].isoformat())
                data['value'].append(item[7])
    except Exception:
        logging.exception('')
        return Response('数据库读取错误', 500)
    finally:
        if conn is not None:
            conn.close()

    data['metadata'] = {}
    data['metadata']['username'] = username
    data['value_ma'] = moving_average(data['value'], 14)
    data['value_ma'].extend([None, None, None, None, None, None, None, None, None, None, None, None, None])
    data['date'].reverse()
    data['value'].reverse()
    data['value_ma'].reverse()
    return flask.jsonify(data)


def stop_signal_handler(*args):

    global stop_signal
    stop_signal = True
    logging.info(f'Signal [{args[0]}] received, exiting')
    sys.exit(0)


@click.command()
@click.option('--debug', is_flag=True)
def main(debug):

    port = -1
    global allowed_ext, app_address, db_url, db_username, db_password, db_name
    global debug_mode, external_script_dir, log_path

    debug_mode = debug
    try:
        with open(settings_path, 'r') as json_file:
            json_str = json_file.read()
            data = json.loads(json_str)
        app.secret_key = data['flask']['secret_key']
        app.config['MAX_CONTENT_LENGTH'] = data['flask']['max_upload_size']
        app.config['SESSION_COOKIE_SECURE'] = data['flask']['https_only']
        allowed_ext = data['app']['allowed_ext']
        app_address = data['app']['address']
        port = data['flask']['port']
        host = data['flask']['host']
        db_url = data['database']['url']
        db_username = data['database']['username']
        db_password = data['database']['password']
        db_name = data['database']['name']
        external_script_dir = data['app']['external_script_dir']
        log_path = data['app']['log_path']
    except Exception as e:
        data = None
        print(f'{e}')
        return

    logging.basicConfig(
        filename=log_path,
        level=logging.DEBUG if debug else logging.INFO,
        format=('%(asctime)s %(levelname)s '
                '%(module)s-%(funcName)s: %(message)s'),
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    logging.info(f'{app_name} started')

    if debug:
        print('Running in debug mode')
        logging.info('Running in debug mode')
    else:
        logging.info('Running in production mode')

    signal.signal(signal.SIGINT, stop_signal_handler)
    signal.signal(signal.SIGTERM, stop_signal_handler)
    th_email = threading.Thread(target=emailer.send_service_start_notification,
                                kwargs={'settings_path': settings_path,
                                        'service_name': app_name,
                                        'path_of_logs_to_send': log_path,
                                        'delay': 0 if debug else 300})
    th_email.start()

    serve(app, host=host, port=port)


if __name__ == '__main__':

    main()
