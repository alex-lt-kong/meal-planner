#!/usr/bin/python3
# -*- coding: utf-8 -*-

import flask
import json
from sqlalchemy.sql import select, and_
from sqlalchemy import create_engine
from sqlalchemy import MetaData, Column, Table, ForeignKey
from sqlalchemy import Integer, String

engine = create_engine('mysql+pymysql://meal-planner:cACnUS5gBTRCeTQg@localhost/meal-planner')

metadata = MetaData(bind=engine)
mp = Table('meal_plan', metadata, autoload_with=engine)
# This line only works if table name is correct.


metadata = MetaData(bind=engine)
notes = Table('notes', metadata, autoload_with=engine)

s = select([notes.c.date, notes.c.content]).order_by(notes.c.date.asc())
with engine.begin() as conn:
    result = conn.execute(s)

dicts = [dict(r) for r in result]

print(dicts)
#dicts_json =  flask.jsonify(dicts)
#data_json = json.dumps([dict(r) for r in result])
#print(data_json)
