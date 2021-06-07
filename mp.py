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
app.secret_key = b'jkjk*&(*&98wqoe"]/e;.fdloefkiue78u9io1'
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

CORS(app)
#  This necessary for javascript to access a telemetry link without opening it:
#  https://stackoverflow.com/questions/22181384/javascript-no-access-control-allow-origin-header-is-present-on-the-requested
stop_signal = False
app_name = 'meal-planner'
log_path = f'/var/log/mamsds/{app_name}.log'
relative_url = f'../{app_name}'
settings_path = f'/root/bin/{app_name}/settings.json'
blacklist_path = f'/root/bin/{app_name}/blacklist.json'
notes_path = f'/root/bin/{app_name}/notes.json'
users_path = f'/root/bin/{app_name}/users.json'
meal_plan = None
meal_plan_today = None

db_url = 'localhost'
db_username = 'meal_planner'
db_password = 'asdasJASDer3'
db_name = 'meal_planner'

meal_plan_items = ['breakfast', 'morning_extra_meal',
                   'lunch', 'afternoon_extra_meal',
                   'dinner', 'evening_extra_meal']
meal_plan_items_cn = ['早餐', '上午加餐', '午餐', '下午加餐', '晚餐', '晚上加餐']


def update_meal_plan_to_db(new_meal_plan, date_string):

    # today = datetime.datetime.now().strftime("%Y-%m-%d")

    logging.debug(f'raw string submitted by client: [{new_meal_plan}]')
    logging.debug(f'decoded string submitted by client: [{new_meal_plan}]')

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    #  It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    sql = 'SELECT `id`, `date` FROM `meal_plan` WHERE `date` = %s'
    cursor.execute(sql, (date_string))
    results = cursor.fetchall()

    if len(results) > 0:
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

    parameters = (date_string,
                  new_meal_plan['breakfast'],
                  new_meal_plan['breakfast_review'],
                  new_meal_plan['morning_extra_meal'],
                  new_meal_plan['morning_extra_meal_review'],
                  new_meal_plan['lunch'],
                  new_meal_plan['lunch_review'],
                  new_meal_plan['afternoon_extra_meal'],
                  new_meal_plan['afternoon_extra_meal_review'],
                  new_meal_plan['dinner'],
                  new_meal_plan['dinner_review'],
                  new_meal_plan['evening_extra_meal'],
                  new_meal_plan['evening_extra_meal_review'],
                  new_meal_plan['daily_remark'])

    cursor.execute(sql, parameters)
    cursor.close()
    conn.close()



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


def detect_modification_type(meal_plan_new, meal_plan_old):

    if meal_plan_old is None or meal_plan_new is None:
        return None
    if len(meal_plan_new) != len(meal_plan_old):
        return None

    mod_types = []
    # type == 0: no modification
    # type == 1: safe modification
    # type == 2: dangerous modification

    for i in range(len(meal_plan_new)):
        # Iterate meals, not days
        mod_types.append(0)

        if len(meal_plan_old[i]) > 0 and len(meal_plan_old[i][0]) > 0:
            res_old = re.split(r'(-?\d*\.?\d+)', meal_plan_old[i][0])[2:]
        else:
            res_old = []

        if len(meal_plan_new[i]) > 0 and len(meal_plan_new[i][0]) > 0:
            res_new = re.split(r'(-?\d*\.?\d+)', meal_plan_new[i][0])[2:]
        else:
            res_new = []
        # The 1st element from this flawed split is a space
        # The 2nd element is the timestamp

        if len(res_old) != len(res_new):
            mod_types[i] = 2
        else:
            for j in range(len(res_old)):
                if res_old[j] != res_new[j]:
                    try:
                        f1, f2 = float(res_old[j]), float(res_new[j])
                        if f2 > f1:
                            mod_types[i] = 2
                        elif mod_types[i] == 0:
                            mod_types[i] = 1
                    except Exception as ex:
                        logging.debug(f'{ex}: {res_old[j]}, {res_new[j]}')
                        mod_types[i] = 2
                        break
    return mod_types


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
            return render_template('login.html',
                                   message=f'用户{request.form["username"]}不存在')
        password = request.form['password'].encode('utf-8')
        if (hashlib.sha256(password).hexdigest()
                != json_data['users'][request.form['username']]):
            return render_template('login.html', message='密码错误')
        session[f'{app_name}'] = {}
        session[f'{app_name}']['username'] = request.form['username']

        return redirect(f'{relative_url}/')

    return render_template('login.html', message='')


@app.route('/get-meal-plan/', methods=['GET'])
def get_meal_plan():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return Response('错误：未登录', 401)

    if 'date' in request.args:
        date = request.args['date']
    else:
        return Response('错误：未指定参数date', 401)
    try:
        date_string = dt.datetime.strptime(date, '%Y-%m-%d')
    except Exception as e:
        return Response(f'date的值[{date}]不正确：{e}', 400)

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
    print(res)
    meal_plan = {}
    meal_plan['date'] = date_string
    meal_plan['breakfast'] = res[0][0]
    meal_plan['breakfast_feedback'] = res[0][1]
    meal_plan['morning_extra_meal'] = res[0][2]
    meal_plan['morning_extra_meal_feedback'] = res[0][3]
    meal_plan['lunch'] = res[0][4]
    meal_plan['lunch_feedback'] = res[0][5]
    meal_plan['afternoon_extra_meal'] = res[0][6]
    meal_plan['afternoon_extra_meal_feedback'] = res[0][7]
    meal_plan['dinner'] = res[0][8]
    meal_plan['dinner_feedback'] = res[0][9]
    meal_plan['evening_extra_meal'] = res[0][10]
    meal_plan['evening_extra_meal_feedback'] = res[0][11]
    meal_plan['daily_remark'] = res[0][12]

    return flask.jsonify(meal_plan)


@app.route('/plans-history/', methods=['GET', 'POST'])
def plans_history():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return redirect(f'{relative_url}/login/')

    if 'date' in request.args:
        date = request.args['date']
    else:
        date = dt.datetime.now().strftime("%Y-%m-%d")

    try:
        date = dt.datetime.strptime(date, '%Y-%m-%d')
    except Exception as e:
        return Response(f'错误：参数date的值[{date}]不正确：{e}', 400)

    yesterday = (date + dt.timedelta(days=-1)).strftime("%Y-%m-%d")
    tomorrow = (date + dt.timedelta(days=1)).strftime("%Y-%m-%d")
    results = read_meal_plan_from_db(date)
    results_old = read_meal_plan_from_db(yesterday)
    if results is not None and results_old is not None:
        mod_types = detect_modification_type(meal_plan_new=results,
                                             meal_plan_old=results_old)
    else:
        mod_types = None

    if results is not None:
        breakfast = results[0]
        morning_extra_meal = results[1]
        lunch = results[2]
        afternoon_extra_meal = results[3]
        dinner = results[4]
        evening_extra_meal = results[5]
        daily_remark = results[6]
        if daily_remark is not None:
            daily_remark = daily_remark.replace('\n', '<br>')
    else:
        breakfast = ['[无记录]', '-']
        morning_extra_meal = ['[无记录]', '-']
        lunch = ['[无记录]', '-']
        afternoon_extra_meal = ['[无记录]', '-']
        dinner = ['[无记录]', '-']
        evening_extra_meal = ['[无记录]', '-']
        daily_remark = ''

    return render_template('plans-history.html',
                           date=date.strftime("%Y-%m-%d"),
                           yesterday=yesterday, tomorrow=tomorrow,
                           breakfast=breakfast,
                           morning_extra_meal=morning_extra_meal,
                           lunch=lunch,
                           afternoon_extra_meal=afternoon_extra_meal,
                           dinner=dinner,
                           evening_extra_meal=evening_extra_meal,
                           daily_remark=daily_remark,
                           username=username, mod_types=mod_types)


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


def read_notes():

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    cursor = conn.cursor()
    sql = '''SELECT `id`, `date`, `content` FROM `notes`
             WHERE `date` = (SELECT MAX(`date`) FROM `notes`)'''
    cursor.execute(sql)
    results = cursor.fetchall()

    content = ''
    if len(results) > 0:
        content = results[0][2]

    return content


@app.route('/update-notes/', methods=['GET', 'POST'])
def update_notes():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        pass
    else:
        return redirect(f'{relative_url}/login/')

    if 'content' not in request.form or len(request.form['content']) == 0:
        return Response('没有收到数据', 400)
    content = request.form['content']

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    #  It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    sql = 'DELETE FROM `notes` WHERE `date` = CURDATE()'
    cursor.execute(sql)

    sql = 'INSERT INTO `notes` (`date`, `content`) VALUES (CURDATE(), %s)'

    cursor.execute(sql, (content))
    cursor.close()
    conn.close()
    return Response('更新成功', 200)


@app.route('/', methods=['GET', 'POST'])
def index():

    if f'{app_name}' in session and 'username' in session[f'{app_name}']:
        username = session[f'{app_name}']['username']
    else:
        return redirect(f'{relative_url}/login/')

    global meal_plan_today, meal_plan_tomorrow
    day_strings = []
    day_strings.append([(dt.date.today() + dt.timedelta(days = -1)).strftime('%Y%m%d'), 'yesterday', '昨日', (dt.date.today() + dt.timedelta(days = -1)).strftime('%m月%d日')])
    day_strings.append([(dt.date.today() + dt.timedelta(days = 0)).strftime('%Y%m%d'), 'today', '今日', (dt.date.today() + dt.timedelta(days = 0)).strftime('%m月%d日')])
    day_strings.append([(dt.date.today() + dt.timedelta(days = 1)).strftime('%Y%m%d'), 'tomorrow', '明日', (dt.date.today() + dt.timedelta(days = 1)).strftime('%m月%d日')])

    logging.debug('request.form: [{}]'.format(request.form))
    if 'date' in request.form:
        for meal_plan_item in meal_plan_items:
            if meal_plan_item not in request.form:
                return Response('错误：缺少参数{}'.format(meal_plan_item), 400)

        i = int(request.form['date'])
        if i < 0 or i > len(day_strings) - 1:
            return Response('错误：参数date的值不正确', 400)

        try:
            update_meal_plan_to_db(request.form, day_strings[i][0])
        except Exception as e:
            return Response(f'保存食谱数据错误！原因：{e}', 400)

    meal_plans = [[None] * len(meal_plan_items),
                  [None] * len(meal_plan_items),
                  [None] * len(meal_plan_items)]
    daily_remarks = ['', '', '']
    try:
        for i in range(len(day_strings)):
            retval = read_meal_plan_from_db(day_strings[i][0])
            if retval is not None:
                for j in range(len(retval) - 1):
                    meal_plans[i][j] = retval[j]

                daily_remarks[i] = retval[len(retval) - 1]
            else:
                meal_plans[i][0] = ''
                meal_plans[i][1] = ''
                meal_plans[i][2] = ''
                meal_plans[i][3] = ''
                meal_plans[i][4] = ''
                meal_plans[i][5] = ''
                daily_remarks[i] = ''
    except Exception as e:
        return Response(f'读取食谱数据错误！原因：{e}', 400)

    mod_types = detect_modification_type(meal_plan_new=meal_plans[1],
                                         meal_plan_old=meal_plans[0])

    if 'banned_items' in request.form and 'limited_items' in request.form:
        write_blacklist_to_json_file(request.form['banned_items'],
                                     request.form['limited_items'])
    banned_items, limited_items = read_blacklist_from_json_file()

    return render_template('planner.html',
                           day_strings=day_strings,
                           username=username,
                           meal_plan_items=meal_plan_items,
                           meal_plan_items_cn=meal_plan_items_cn,
                           daily_remarks=daily_remarks,
                           meal_plans=meal_plans, mod_types=mod_types,
                           banned_items=banned_items,
                           limited_items=limited_items,
                           notes=read_notes())


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
    try:
        with open(settings_path, 'r') as json_file:
            json_str = json_file.read()
            json_data = json.loads(json_str)
            app.secret_key = json_data['flask']['secret_key']
            port = json_data['flask']['port']
    except Exception as e:
        json_data = None
        logging.error(e)

    serve(app, host="127.0.0.1", port=port)


if __name__ == '__main__':

    main()
