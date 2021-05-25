#!/usr/bin/python3
# -*- coding: utf-8 -*-

from flask import Flask, render_template, Response, request, redirect, session, url_for
from flask_cors import CORS
from waitress import serve

import argparse
import datetime as dt
import hashlib
import json
import logging
import pymysql
import signal
import smtplib
import sys
import threading
import time

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
app_name = 'meal_planner'
relative_url = f'../{app_name}'
settings_path = '/root/bin/meal-planner/settings.json'
meal_plan_path = '/root/bin/meal-planner/plan.json'
blacklist_path = '/root/bin/meal-planner/blacklist.json'
notes_path = '/root/bin/meal-planner/notes.json'
users_path = '/root/bin/meal-planner/users.json'
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


def write_notes_to_json_file(notes: str):

    try:
        with open(notes_path, 'w+') as json_file:
            json.dump({'notes': notes},
                      json_file, sort_keys=True, indent=4, ensure_ascii=False)
    except Exception as e:
        logging.error(f'Unable to write json data to file [{notes_path}]: {e}')
        return False, e
    return True, ''


def read_notes_from_json_file():

    notes = None
    try:
        with open(notes_path, 'r') as json_file:
            json_str = json_file.read()
            json_data = json.loads(json_str)
            logging.debug(f'json data [{json_data}] read from [{notes_path}]')
            notes = json_data['notes']
    except Exception as e:
        logging.error(f'Unable to read data from file [{notes_path}]: {e}')
        notes = ''

    return notes


def get_day_count_of_all_a(include_aminus=False):

    conn = pymysql.connect(db_url, db_username, db_password, db_name)
    conn.autocommit(True)
    # It appears that both UPDATE and SELECT need "commit"
    cursor = conn.cursor()
    if include_aminus is True:
        sql = '''
        SELECT `date` FROM meal_plan WHERE
        ((`breakfast_feedback` != "A" AND `breakfast_feedback` != "A-"
          AND `breakfast_feedback` != "-") OR
         (`morning_extra_meal_feedback` != "A"  AND
          `morning_extra_meal_feedback` != "A-"  AND
          `morning_extra_meal_feedback` != "-") OR
         (`lunch_feedback` != "A" AND `lunch_feedback` != "A-" AND
          `lunch_feedback` != "-") OR
         (`afternoon_extra_meal_feedback` != "A" AND
          `afternoon_extra_meal_feedback` != "A-"
          AND `afternoon_extra_meal_feedback` != "-") OR
         (`dinner_feedback` != "A"  AND `dinner_feedback` != "A-"  AND
          `dinner_feedback` != "-") OR
         (`evening_extra_meal_feedback` != "A" AND
          `evening_extra_meal_feedback` != "A-" AND
          `evening_extra_meal_feedback` != "-")) AND
         `date` <= CURDATE()
         ORDER BY `date` DESC LIMIT 10
        '''
    else:
        sql = '''
        SELECT `date` FROM meal_plan WHERE
        ((`breakfast_feedback` != "A" AND `breakfast_feedback` != "-") OR
         (`morning_extra_meal_feedback` != "A"  AND
          `morning_extra_meal_feedback` != "-") OR
         (`lunch_feedback` != "A" AND `lunch_feedback` != "-") OR
         (`afternoon_extra_meal_feedback` != "A"AND
          `afternoon_extra_meal_feedback` != "-") OR
         (`dinner_feedback` != "A"  AND
          `dinner_feedback` != "-") OR
         (`evening_extra_meal_feedback` != "A" AND
          `evening_extra_meal_feedback` != "-")) AND
         `date` <= CURDATE()
         ORDER BY `date` DESC LIMIT 10
        '''
    cursor.execute(sql,)
    last_failure = cursor.fetchall()
    cursor.close()
    conn.close()
    if len(last_failure) == 0:
        return None
    else:
        delta1 = dt.date.today() - last_failure[0][0]
        delta2 = last_failure[0][0] - last_failure[1][0]
        delta3 = last_failure[1][0] - last_failure[2][0]
        delta4 = last_failure[2][0] - last_failure[3][0]
        delta5 = last_failure[3][0] - last_failure[4][0]
        delta6 = last_failure[4][0] - last_failure[5][0]
        delta7 = last_failure[5][0] - last_failure[6][0]
        delta8 = last_failure[6][0] - last_failure[7][0]
        delta9 = last_failure[7][0] - last_failure[8][0]
        delta10 = last_failure[8][0] - last_failure[9][0]
        dayss = [delta2.days, delta3.days, delta4.days,
                 delta5.days, delta6.days, delta7.days,
                 delta8.days, delta9.days, delta10.days]
        return delta1.days, dayss


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


@app.route('/history/', methods=['GET', 'POST'])
def history():

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
    results = read_meal_plan_from_db(date)
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

    return render_template('history.html',
                           date=date.strftime("%Y-%m-%d"),
                           yesterday=(date + dt.timedelta(days=-1)).strftime("%Y-%m-%d"),
                           tomorrow=(date + dt.timedelta(days=1)).strftime("%Y-%m-%d"),
                           breakfast=breakfast,
                           morning_extra_meal=morning_extra_meal,
                           lunch=lunch,
                           afternoon_extra_meal=afternoon_extra_meal,
                           dinner=dinner,
                           evening_extra_meal=evening_extra_meal,
                           daily_remark=daily_remark,
                           username=username)


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

    if 'banned_items' in request.form and 'limited_items' in request.form:
        write_blacklist_to_json_file(request.form['banned_items'],
                                     request.form['limited_items'])
    banned_items, limited_items = read_blacklist_from_json_file()

    if 'notes' in request.form:
        write_notes_to_json_file(request.form['notes'])
    notes = read_notes_from_json_file()

    days_a, dayss_a = get_day_count_of_all_a()
    days_aminus, dayss_aminus = get_day_count_of_all_a(True)
    if (f'{username}_last_reminder' not in session[f'{app_name}']
       or session[f'{app_name}'][f'{username}_last_reminder']
       != dt.datetime.now().strftime('%Y%m%d')):

        session[f'{app_name}'][f'{username}_last_reminder'] = dt.datetime.now().strftime('%Y%m%d')
        show_reminder = True
    else:
        show_reminder = False

    return render_template('planner.html',
                           day_strings=day_strings,
                           username=username,
                           meal_plan_items=meal_plan_items,
                           meal_plan_items_cn=meal_plan_items_cn,
                           daily_remarks=daily_remarks,
                           meal_plans=meal_plans,
                           banned_items=banned_items,
                           limited_items=limited_items,
                           notes=notes,
                           days_a=days_a,
                           dayss_a=', '.join([str(e) for e in dayss_a]),
                           days_aminus=days_aminus,
                           dayss_aminus=', '.join([str(e) for e in dayss_aminus]),
                           show_reminder=show_reminder)


def cleanup(*args):

    global stop_signal
    stop_signal = True
    logging.info('Stop signal received, exiting')
    sys.exit(0)


def send_notification_email(delay: int,
                            from_name: str,
                            subject: str,
                            mainbody: str):

    global stop_signal

    logging.info('Wait for {} seconds before sending the email'.format(delay))
    sec_count = 0
    while sec_count < delay:
        time.sleep(1)
        # This delay has to be long enough to accommodate the startup time of pfSense.
        sec_count += 1
        if stop_signal:
            return
    logging.debug('Sending [{}] notification email'.format(subject))

    try:
        with open(settings_path, 'r') as json_file:
            json_str = json_file.read()
            json_data = json.loads(json_str)
    except Exception as e:
        json_data = None
        logging.error(e)

    sender = json_data['email']['address']
    password = json_data['email']['password']
    receivers = ['admin@mamsds.net']

    message = ('From: {} <{}>\n'
                'To: Mamsds Admin Account <admin@mamsds.net>\n'
                'Content-Type: text/html; charset="UTF-8"\n'
                'Subject: {}\n'
                '<meta http-equiv="Content-Type"  content="text/html charset=UTF-8" /><html><font size="2" color="black">{}</font></html>'.format(from_name, sender, subject, mainbody.replace('\n', '<br>')))

    try:
        smtpObj = smtplib.SMTP(host='server172.web-hosting.com', port=587)
        smtpObj.starttls()
        smtpObj.login(sender, password)
        smtpObj.sendmail(sender, receivers, message.encode('utf-8'))
        smtpObj.quit()
        logging.debug("Email [{}] sent successfully".format(subject))
    except Exception as e:
        logging.error(f'{e}')


def main():

    ap = argparse.ArgumentParser()
    ap.add_argument('--debug', dest='debug', action='store_true')
    args = vars(ap.parse_args())
    debug_mode = args['debug']

    logging.basicConfig(
        filename='/var/log/mamsds/meal-planner.log',
        level=logging.DEBUG if debug_mode else logging.INFO,
        format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    logging.info('meal planner started')
    start_time = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if debug_mode is True:
        print('Running in debug mode')
        logging.info('Running in debug mode')
    else:
        logging.info('Running in production mode')

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    email_sender = threading.Thread(target=send_notification_email,
                                    args=(0 if debug_mode else 600,
                                          'meal planner notification service',
                                          'meal planner started',
                                          'meal planner is started at {}'.format(start_time)))
    email_sender.start()
    logging.info('meal planner server')

    serve(app, host="127.0.0.1", port=92)


if __name__ == '__main__':

    main()