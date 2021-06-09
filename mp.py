#!/usr/bin/python3
# -*- coding: utf-8 -*-

from flask import Flask, render_template, Response, request, redirect, session
from flask_cors import CORS
from PIL import Image
from waitress import serve

import argparse
import datetime as dt
import flask
import hashlib
import json
import logging
import os
import pymysql
import re
import signal
import sys
import threading

import importlib.machinery
loader = importlib.machinery.SourceFileLoader('emailer',
                                              '/root/bin/emailer/emailer.py')
emailer = loader.load_module()

app = Flask(__name__)
app.secret_key = b''
app.config['MAX_CONTENT_LENGTH'] = 1
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

CORS(app)
#  This necessary for javascript to access a telemetry link without opening it:
#  https://stackoverflow.com/questions/22181384/javascript-no-access-control-allow-origin-header-is-present-on-the-requested

allowed_ext = ['7z', 'apk', 'avi', 'bmp', 'conf', 'crt', 'csv', 'doc', 'docx',
               'flv', 'gif', 'ico', 'iso', 'jpeg', 'jpg', 'key', 'mp3', 'mp4',
               'mkv', 'mov', 'mpg', 'mpeg', 'ods', 'odt', 'ovpn', 'pdf',
               'pem', 'png', 'ppt', 'pptx', 'psd', 'rar', 'rtf', 'srt', 'sql',
               'sqlite', 'tif', 'tiff', 'ttf', 'txt', 'wav', 'm4a', 'webm',
               'wma', 'wmv', 'xls', 'xlsx', 'xml', 'zip']
app_name = 'meal-planner'
attachments_path = f'/root/bin/{app_name}/resources/attachments'
db_url, db_username, db_password, db_name = '', '', '', ''
json_data = None
log_path = f'/var/log/mamsds/{app_name}.log'
relative_url = f'../{app_name}'
settings_path = f'/root/bin/{app_name}/settings.json'
selfies_path = f'/root/bin/{app_name}/resources/selfies'
stop_signal = False
blacklist_path = f'/root/bin/{app_name}/blacklist.json'
users_path = f'/root/bin/{app_name}/users.json'


@app.route('/get-attachments-list/', methods=['GET'])
def get_attachment_list():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)
    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('错误：未指定参数date', 401)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception as e:
        return Response(f'参数date的语法不正确：{e}', 401)

    attachments_path_today = os.path.join(attachments_path, date_string)
    data = {}
    data['date'] = date_string
    if os.path.isdir(attachments_path_today):
        data['filenames'] = os.listdir(attachments_path_today)
    else:
        data['filenames'] = None

    return flask.jsonify(data)


@app.route('/remove-attachment/', methods=['GET'])
def remove_attachment():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)
    if 'date' in request.args and 'filename' in request.args:
        date_string = request.args['date']
        filename = request.args['filename']
        filename = sanitize_filename(filename)
    else:
        return Response('错误：未指定参数date或filename', 401)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception as e:
        return Response(f'参数date的语法不正确：{e}', 401)

    attachments_path_today = os.path.join(attachments_path, date_string)
    data = {}
    data['date'] = date_string
    if os.path.isdir(attachments_path_today) is False:
        return Response(f'文件{filename}不存在', 401)
    file_path = os.path.join(attachments_path_today, filename)
    if os.path.isfile(file_path) is False:
        return Response(f'文件{filename}不存在', 401)

    try:
        os.remove(file_path)
    except Exception as e:
        return Response(f'文件{filename}删除失败：{e}', 500)
    return Response('文件{filename}删除成功', 200)


@app.route('/get-attachment/', methods=['GET'])
def get_attachment():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)
    if 'date' in request.args and 'filename' in request.args:
        date_string = request.args['date']
        filename = request.args['filename']
        filename = sanitize_filename(filename)
    else:
        return Response('错误：未指定参数date或filename', 401)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception as e:
        return Response(f'参数date的语法不正确：{e}', 401)

    attachments_path_today = os.path.join(attachments_path, date_string)
    data = {}
    data['date'] = date_string
    if os.path.isdir(attachments_path_today) is False:
        return Response(f'文件{filename}不存在', 401)
    file_path = os.path.join(attachments_path_today, filename)
    if os.path.isfile(file_path) is False:
        return Response(f'文件{filename}不存在', 401)

    return flask.send_from_directory(directory=attachments_path_today,
                                     filename=filename,  as_attachment=False,
                                     attachment_filename=filename)


def sanitize_filename(filename):
    # This function may be not robust enough... but should be good enough
    # for this use case...
    # also, the security is enhanced by the use of send_from_directory()
    error_set = ['/', '\\', ':', '*', '?', '"', '|', '<', '>', ' ', '..']
    for c in filename:
        if c in error_set:
            filename = filename.replace(c, '_')
    if len(filename) > 64:
        filename = filename[:31] + '__' + filename[-31:]
    return filename


@app.route('/upload-attachment/', methods=['POST'])
def upload_attachment():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'selected_file' not in request.files:
        return Response('没有收到附件', 400)
    if request.files['selected_file'] is None:
        return Response('没有收到附件', 400)

    selected_file = request.files['selected_file']

    if selected_file.filename.rsplit('.', 1)[1].lower() not in allowed_ext:
        return Response(f'仅允许上传后缀为{allowed_ext}的文件', 400)

    date_string = dt.datetime.now().strftime('%Y-%m-%d')
    attachments_path_today = os.path.join(attachments_path, date_string)
    if os.path.isdir(attachments_path_today) is False:
        try:
            os.mkdir(attachments_path_today)
        except Exception as e:
            return Response(f'无法创建文件：{e}', 500)

    filename = sanitize_filename(selected_file.filename)
    selected_file.seek(0)
    selected_file.save(os.path.join(attachments_path_today, filename))

    return Response('附件上传成功', 200)


@app.route('/upload-selfie/', methods=['POST'])
def upload_selfie():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

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
        image.thumbnail((800, 800))
        # (800, 800): the maximum width and maximum height of the thumbnail
        image.save(os.path.join(selfies_path, filename))
    except Exception as e:
        return Response(f'自拍图保存错误：{e}', 500)

    return Response('自拍照上传成功', 200)


@app.route('/if-selfie-exists/', methods=['GET'])
def check_if_selfie_exists():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('未指定参数date', 401)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception as e:
        return Response(f'参数date的语法不正确：{e}', 401)

    image_path = f'/root/bin/meal-planner/resources/selfies/{date_string}.png'

    return '1' if os.path.isfile(image_path) else '0'


@app.route('/get-selfie/', methods=['GET'])
def get_selfie():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('错误：未指定参数date', 401)
    try:
        dt.datetime.strptime(date_string, '%Y-%m-%d')
    except Exception as e:
        return Response(f'参数date的语法不正确：{e}', 401)

    for ext in allowed_ext:
        image_path = os.path.join(selfies_path, f'{date_string}.{ext}')
        if os.path.isfile(image_path):
            return flask.send_from_directory(directory=selfies_path,
                                             filename=f'{date_string}.{ext}',
                                             as_attachment=False)

    return Response('未找到该日期的自拍图', 404)


@app.route('/update-blacklist/', methods=['POST'])
def update_blacklist():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'data' not in request.form:
        return Response('错误：未指定参数data', 400)

    data = request.form['data']
    try:
        json_data = json.loads(data)
    except Exception as e:
        return Response(f'data的值无法解析成JSON字符串：{e}', 400)
    if 'banned_items' not in json_data or 'limited_items' not in json_data:
        return Response(f'JSON数据[{json_data}]格式错误', 400)
    print(json_data)
    try:
        with open(blacklist_path, 'w+') as json_file:
            json.dump(json_data, json_file,
                      sort_keys=True, indent=4, ensure_ascii=False)
    except Exception as e:
        logging.error(f'{e}')
        return Response(f'黑名单写入错误：{e}', 500)

    return Response('黑名单更新成功！', 200)


@app.route('/get-blacklist/', methods=['GET'])
def get_blacklist():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    try:
        with open(blacklist_path, 'r') as json_file:
            json_str = json_file.read()
            blacklist = json.loads(json_str)
    except Exception as e:
        logging.error(f'{e}')
        return Response(f'读取黑名单错误：{e}', 500)

    return flask.jsonify(blacklist)


def get_straight_a_days(include_aminus=False):

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    # It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    if include_aminus is True:
        sql = '''
        SELECT `date` FROM meal_plan WHERE
        ((`breakfast_feedback` != "A" AND `breakfast_feedback` != "A-"
          AND `breakfast_feedback` != "没吃") OR
         (`morning_extra_meal_feedback` != "A"  AND
          `morning_extra_meal_feedback` != "A-"  AND
          `morning_extra_meal_feedback` != "没吃") OR
         (`lunch_feedback` != "A" AND `lunch_feedback` != "A-" AND
          `lunch_feedback` != "没吃") OR
         (`afternoon_extra_meal_feedback` != "A" AND
          `afternoon_extra_meal_feedback` != "A-"
          AND `afternoon_extra_meal_feedback` != "没吃") OR
         (`dinner_feedback` != "A"  AND `dinner_feedback` != "A-"  AND
          `dinner_feedback` != "没吃") OR
         (`evening_extra_meal_feedback` != "A" AND
          `evening_extra_meal_feedback` != "A-" AND
          `evening_extra_meal_feedback` != "没吃")) AND
         `date` <= CURDATE()
         ORDER BY `date` DESC
        '''
    else:
        sql = '''
        SELECT `date` FROM meal_plan WHERE
        ((`breakfast_feedback` != "A" AND `breakfast_feedback` != "没吃") OR
         (`morning_extra_meal_feedback` != "A"  AND
          `morning_extra_meal_feedback` != "没吃") OR
         (`lunch_feedback` != "A" AND `lunch_feedback` != "没吃") OR
         (`afternoon_extra_meal_feedback` != "A"AND
          `afternoon_extra_meal_feedback` != "没吃") OR
         (`dinner_feedback` != "A"  AND
          `dinner_feedback` != "没吃") OR
         (`evening_extra_meal_feedback` != "A" AND
          `evening_extra_meal_feedback` != "没吃")) AND
         `date` <= CURDATE()
         ORDER BY `date` DESC
        '''
    cursor.execute(sql,)
    last_failure = cursor.fetchall()
    cursor.close()
    conn.close()
    if len(last_failure) == 0:
        return None
    else:
        deltas = []
        for i in range(len(last_failure) - 1):
            deltas.append((last_failure[i][0] - last_failure[i+1][0]).days - 1)
            logging.debug(
                f'Include A- [{include_aminus}], from {last_failure[i][0]} to '
                f'{last_failure[i+1][0]}: {deltas[i]} days')

        return deltas


@app.route('/logout/')
def logout():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
        session[f'{app_name}'].pop(f'{username}_last_reminder', None)

    if f'{app_name}' in session:
        session[f'{app_name}'].pop('username', None)

    return redirect(f'{relative_url}/')


@app.before_request
def make_session_permanent():
    session.permanent = True
    app.permanent_session_lifetime = dt.timedelta(days=365)


@app.route('/login/', methods=['GET', 'POST'])
def login():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        return redirect(f'{relative_url}/')

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
        session[f'{app_name}'] = {}
        session[f'{app_name}']['username'] = request.form['username']

        return redirect(f'{relative_url}/')

    return render_template('login.html', message='')


@app.route('/update-meal-plan/', methods=['POST'])
def update_meal_plan():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'date' not in request.form or 'data' not in request.form:
        return Response('错误：未指定参数date或data', 400)
    date = request.form['date']
    data = request.form['data']
    try:
        date_string = dt.datetime.strptime(date, '%Y-%m-%d')
    except Exception as e:
        return Response(f'date的值[{date}]不正确：{e}', 400)
    try:
        json_data = json.loads(data)
    except Exception as e:
        return Response(f'data的值无法解析成JSON字符串：{e}', 400)

    logging.debug(f'raw string submitted by client: [{json_data}]')

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    #  It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    sql = 'DELETE FROM `meal_plan` WHERE `date` = %s'
    cursor.execute(sql, (date_string))

    sql = '''
    INSERT INTO `meal_plan` (`date`,
    `breakfast`, `breakfast_feedback`,
    `morning_extra_meal`, `morning_extra_meal_feedback`,
    `lunch`, `lunch_feedback`,
    `afternoon_extra_meal`, `afternoon_extra_meal_feedback`,
    `dinner`, `dinner_feedback`,
    `evening_extra_meal`, `evening_extra_meal_feedback`,
    `daily_remark`)
     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''

    parameters = (
        date_string,
        json_data['breakfast']['content'], json_data['breakfast']['feedback'],
        json_data['morning_extra_meal']['content'],
        json_data['morning_extra_meal']['feedback'],
        json_data['lunch']['content'], json_data['lunch']['feedback'],
        json_data['afternoon_extra_meal']['content'],
        json_data['afternoon_extra_meal']['feedback'],
        json_data['dinner']['content'], json_data['dinner']['feedback'],
        json_data['evening_extra_meal']['content'],
        json_data['evening_extra_meal']['feedback'],
        json_data['daily_remark'])

    try:
        cursor.execute(sql, parameters)
    except Exception as e:
        cursor.close()
        conn.close()
        return Response(f'数据库更新错误：{e}', 500)

    cursor.close()
    conn.close()
    return Response(f'更新{date_string}食谱成功！', 200)


def insert_modification_type(meal_plan_new):

    today = dt.datetime.strptime(meal_plan_new['date'], '%Y-%m-%d')
    yesterday = today - dt.timedelta(days=1)
    meal_plan_old = convert_meal_plan_to_json(
        dt.datetime.strftime(yesterday, '%Y-%m-%d'))

    # type == 0: no modification
    # type == 1: safe modification
    # type == 2: dangerous modification

    meals = ['breakfast', 'morning_extra_meal',
             'lunch', 'afternoon_extra_meal',
             'dinner', 'evening_extra_meal']

    re_str = r'(-?\d*\.?\d+)'
    res_old, res_new = {}, {}
    for meal in meals:
        # Iterate meals, not days
        meal_plan_new[meal]['modification_type'] = 0

        if len(meal_plan_new[meal]['content']) > 0:
            res_new[meal] = re.split(re_str,
                                     meal_plan_new[meal]['content'])[2:]
        else:
            res_new[meal] = []

        if len(meal_plan_old[meal]['content']) > 0:
            res_old[meal] = re.split(re_str,
                                     meal_plan_old[meal]['content'])[2:]
        else:
            res_old[meal] = []
        # The 1st element from this flawed regex split is a space
        # The 2nd element is the timestamp

        if len(res_old[meal]) != len(res_new[meal]):
            meal_plan_new[meal]['modification_type'] = 2
        else:
            for j in range(len(res_old[meal])):
                if res_old[meal][j] != res_new[meal][j]:
                    try:
                        f1 = float(res_old[meal][j])
                        f2 = float(res_new[meal][j])
                        if f2 > f1:
                            meal_plan_new[meal]['modification_type'] = 2
                        elif meal_plan_new[meal]['modification_type'] == 0:
                            meal_plan_new[meal]['modification_type'] = 1
                    except Exception as ex:
                        logging.debug(
                            f'{ex}: '
                            f'{res_old[meal][j]}, {res_new[meal][j]}')
                        meal_plan_new[meal]['modification_type'] = 2
                        break
    return meal_plan_new


def convert_meal_plan_to_json(date_string: str):

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    # It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()

    sql = '''
         SELECT `breakfast`, `breakfast_feedback`,
         `morning_extra_meal`, `morning_extra_meal_feedback`,
         `lunch`, `lunch_feedback`,
         `afternoon_extra_meal`, `afternoon_extra_meal_feedback`,
         `dinner`, `dinner_feedback`,
         `evening_extra_meal`, `evening_extra_meal_feedback`, `daily_remark`
         FROM `meal_plan` WHERE `date` = %s'''
    cursor.execute(sql, (date_string))
    res = cursor.fetchall()
    cursor.close()
    conn.close()

    meal_plan = {}
    meal_plan['date'] = date_string
    meal_plan['breakfast'] = {}
    meal_plan['breakfast']['title'] = '早餐'
    meal_plan['morning_extra_meal'] = {}
    meal_plan['morning_extra_meal']['title'] = '上午加餐'
    meal_plan['lunch'] = {}
    meal_plan['lunch']['title'] = '午餐'
    meal_plan['afternoon_extra_meal'] = {}
    meal_plan['afternoon_extra_meal']['title'] = '下午加餐'
    meal_plan['dinner'] = {}
    meal_plan['dinner']['title'] = '晚餐'
    meal_plan['evening_extra_meal'] = {}
    meal_plan['evening_extra_meal']['title'] = '晚上加餐'

    if len(res) > 0:
        meal_plan['breakfast']['content'] = res[0][0]
        meal_plan['breakfast']['feedback'] = res[0][1]
        meal_plan['morning_extra_meal']['content'] = res[0][2]
        meal_plan['morning_extra_meal']['feedback'] = res[0][3]
        meal_plan['lunch']['content'] = res[0][4]
        meal_plan['lunch']['feedback'] = res[0][5]
        meal_plan['afternoon_extra_meal']['content'] = res[0][6]
        meal_plan['afternoon_extra_meal']['feedback'] = res[0][7]
        meal_plan['dinner']['content'] = res[0][8]
        meal_plan['dinner']['feedback'] = res[0][9]
        meal_plan['evening_extra_meal']['content'] = res[0][10]
        meal_plan['evening_extra_meal']['feedback'] = res[0][11]
        meal_plan['daily_remark'] = res[0][12]
    else:
        meal_plan['breakfast']['content'] = ''
        meal_plan['breakfast']['feedback'] = ''
        meal_plan['morning_extra_meal']['content'] = ''
        meal_plan['morning_extra_meal']['feedback'] = ''
        meal_plan['lunch']['content'] = ''
        meal_plan['lunch']['feedback'] = ''
        meal_plan['afternoon_extra_meal']['content'] = ''
        meal_plan['afternoon_extra_meal']['feedback'] = ''
        meal_plan['dinner']['content'] = ''
        meal_plan['dinner']['feedback'] = ''
        meal_plan['evening_extra_meal']['content'] = ''
        meal_plan['evening_extra_meal']['feedback'] = ''
        meal_plan['daily_remark'] = ''

    return meal_plan


@app.route('/get-meal-plan/', methods=['GET'])
def get_meal_plan():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'date' in request.args:
        date_string = request.args['date']
    else:
        return Response('错误：未指定参数date', 401)

    meal_plan = convert_meal_plan_to_json(date_string)
    meal_plan = insert_modification_type(meal_plan)

    logging.debug(f'meal_plan to be sent to client: {meal_plan}')

    return flask.jsonify(meal_plan)


@app.route('/history-notes/', methods=['GET'])
def history_notes():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return redirect(f'{relative_url}/login/')

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    cursor = conn.cursor()
    sql = '''SELECT DATE_FORMAT(`date`,'%Y-%m-%d'), `content`
             FROM `notes` ORDER BY `date` ASC'''
    cursor.execute(sql)
    results = cursor.fetchall()

    return render_template('history-notes.html',
                           username=username,
                           results=results)


def convert_notes_to_json():

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    cursor = conn.cursor()
    sql = '''SELECT `id`, `date`, `content` FROM `notes`
             WHERE `date` = (SELECT MAX(`date`) FROM `notes`)'''
    cursor.execute(sql)
    results = cursor.fetchall()

    notes_json = {}
    notes_json['date'], notes_json['content'] = None, None
    if len(results) > 0:
        notes_json['date'] = results[0][1]
        notes_json['content'] = results[0][2]

    return notes_json


@app.route('/get-notes/', methods=['GET'])
def get_notes():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    notes_json = convert_notes_to_json()
    return flask.jsonify(notes_json)


@app.route('/update-notes/', methods=['POST'])
def update_notes():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return Response('错误：未登录', 401)

    if 'data' not in request.form or len(request.form['data']) == 0:
        return Response('没有收到数据', 400)
    data = request.form['data']
    try:
        json_data = json.loads(data)
    except Exception as e:
        return Response(f'data的值无法解析成JSON字符串：{e}', 400)
    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    #  It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    sql = 'DELETE FROM `notes` WHERE `date` = CURDATE()'
    cursor.execute(sql)

    sql = 'INSERT INTO `notes` (`date`, `content`) VALUES (CURDATE(), %s)'
    try:
        cursor.execute(sql, (json_data['content']))
    except Exception as e:
        cursor.close()
        conn.close()
        logging.error(f'{e}')
        return Response(f'数据库更新错误：{e}', 500)

    cursor.close()
    conn.close()
    return Response('更新成功', 200)


@app.route('/', methods=['GET'])
def index():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return redirect(f'{relative_url}/login/')

    return render_template('index.html', username=username)


@app.route('/history-plans/', methods=['GET', 'POST'])
def history_plans():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return redirect(f'{relative_url}/login/')
    return render_template('history-plans.html', username=username)


@app.route('/straight_a/', methods=['GET', 'POST'])
def straight_a():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return redirect(f'{relative_url}/login/')

    deltas_a = get_straight_a_days(False)
    deltas_a_minus = get_straight_a_days(True)

    dayss_a, dayss_a_minus = '', ''
    for i in range(1, 7):
        dayss_a = dayss_a + ', ' + str(deltas_a[i])
        dayss_a_minus = dayss_a_minus + ', ' + str(deltas_a_minus[i])
    return render_template('straight-a.html',
                           days_a=deltas_a[0], dayss_a=dayss_a,
                           days_a_minus=deltas_a_minus[0],
                           dayss_a_minus=dayss_a_minus,
                           max_a=max(deltas_a),
                           max_a_minus=max(deltas_a_minus))


def stop_signal_handler(*args):

    global stop_signal
    stop_signal = True
    logging.info(f'Signal [{args[0]}] received, exiting')
    sys.exit(0)


def main():

    ap = argparse.ArgumentParser()
    ap.add_argument('--debug', dest='debug', action='store_true')
    args = vars(ap.parse_args())
    debug_mode = args['debug']

    logging.basicConfig(
        filename=log_path,
        level=logging.DEBUG if debug_mode else logging.INFO,
        format=('%(asctime)s %(levelname)s '
                '%(module)s-%(funcName)s: %(message)s'),
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    logging.info(f'{app_name} started')

    if debug_mode is True:
        print('Running in debug mode')
        logging.info('Running in debug mode')
    else:
        logging.info('Running in production mode')

    signal.signal(signal.SIGINT, stop_signal_handler)
    signal.signal(signal.SIGTERM, stop_signal_handler)
    th_email = threading.Thread(target=emailer.send_service_start_notification,
                                kwargs={'settings_path': settings_path,
                                        'service_name': f'{app_name}',
                                        'log_path': log_path,
                                        'delay': 0 if debug_mode else 300})
    th_email.start()
    logging.info(f'{app_name} server')

    port = -1
    global db_url, db_username, db_password, db_name

    try:
        with open(settings_path, 'r') as json_file:
            json_str = json_file.read()
            data = json.loads(json_str)
        app.secret_key = data['flask']['secret_key']
        app.config['MAX_CONTENT_LENGTH'] = data['flask']['max_upload_size']
        port = data['flask']['port']
        db_url = data['database']['url']
        db_username = data['database']['username']
        db_password = data['database']['password']
        db_name = data['database']['name']
        logging.debug(f'data: {data}')
    except Exception as e:
        data = None
        logging.error(f'data error: {e}')
        return

    serve(app, host="127.0.0.1", port=port)


if __name__ == '__main__':

    main()
