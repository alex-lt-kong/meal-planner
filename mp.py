#!/usr/bin/python3
# -*- coding: utf-8 -*-

from flask import Flask, render_template, Response, request, redirect, session
from flask_cors import CORS
from waitress import serve

import argparse
import datetime as dt
import flask
import hashlib
import json
import logging
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
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

CORS(app)
#  This necessary for javascript to access a telemetry link without opening it:
#  https://stackoverflow.com/questions/22181384/javascript-no-access-control-allow-origin-header-is-present-on-the-requested

app_name = 'meal-planner'
db_url, db_username, db_password, db_name = '', '', '', ''
json_data = None
log_path = f'/var/log/mamsds/{app_name}.log'
relative_url = f'../{app_name}'
settings_path = f'/root/bin/{app_name}/settings.json'
stop_signal = False
blacklist_path = f'/root/bin/{app_name}/blacklist.json'
notes_path = f'/root/bin/{app_name}/notes.json'
users_path = f'/root/bin/{app_name}/users.json'
meal_plan = None
meal_plan_today = None


def write_blacklist_to_json_file(banned_items: str, limited_items: str):

    try:
        with open(blacklist_path, 'w+') as json_file:
            json.dump({'banned_items': banned_items,
                       'limited_items': limited_items},
                      json_file, sort_keys=True, indent=4, ensure_ascii=False)

    except Exception as e:
        logging.error(f'Unable to write data to file [{blacklist_path}]: {e}')
        return False, sys.exc_info()

    return True, ''


def read_meal_plan_from_db(date_string):

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
    meal_plan = cursor.fetchall()
    cursor.close()
    conn.close()
    if len(meal_plan) == 0:
        return None
    else:
        return [[meal_plan[0][0], meal_plan[0][1]],
                [meal_plan[0][2], meal_plan[0][3]],
                [meal_plan[0][4], meal_plan[0][5]],
                [meal_plan[0][6], meal_plan[0][7]],
                [meal_plan[0][8], meal_plan[0][9]],
                [meal_plan[0][10], meal_plan[0][11]],
                meal_plan[0][12]]


def read_blacklist_from_json_file():

    blacklist = None
    banned_items, limited_items = '', ''
    try:
        with open(blacklist_path, 'r') as json_file:
            json_str = json_file.read()
            json_data = json.loads(json_str)
            logging.debug(f'data [{json_data}] read from [{blacklist_path}]')
            blacklist = json_data
        banned_items = blacklist['banned_items']
        limited_items = blacklist['limited_items']
    except Exception as e:
        logging.error(f'Unable to read data from file [{blacklist_path}]: {e}')
        blacklist = {}
        banned_items = ''
        limited_items = ''

    return banned_items, limited_items


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


@app.route('/notes-history/', methods=['GET'])
def notes_history():

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

    return render_template('notes-history.html',
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

    if 'banned_items' in request.form and 'limited_items' in request.form:
        write_blacklist_to_json_file(request.form['banned_items'],
                                     request.form['limited_items'])
    banned_items, limited_items = read_blacklist_from_json_file()

    return render_template('index.html',
                           username=username,
                           banned_items=banned_items,
                           limited_items=limited_items)


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
            json_data = json.loads(json_str)
            app.secret_key = json_data['flask']['secret_key']
            port = json_data['flask']['port']
            db_url = json_data['database']['url']
            db_username = json_data['database']['username']
            db_password = json_data['database']['password']
            db_name = json_data['database']['name']
            logging.debug(f'json_data: {json_data}')
    except Exception as e:
        json_data = None
        logging.error(f'json_data error: {e}')

    serve(app, host="127.0.0.1", port=port)


if __name__ == '__main__':

    main()
