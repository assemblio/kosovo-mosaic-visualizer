#!/usr/local/bin/python3.1
# -*- coding: utf-8 -*-
from mosaicData import MosaicData
import argparse
import json

# Sample Command: python bin/create_data.py --s data/raw_data/data.xlsx --d data/raw_data/data.xlsx --p data/raw_data/data.xlsx --w data/standard_lists/whitelist.xlsx

# Setup Parameters
parser = argparse.ArgumentParser(description='Convert data format for visualizer')
parser.add_argument('--s', type=str, help="Including this parameter will cause the script to refresh the satisfied indicators data. The parameter should immediately be followed by the file path of the file with the new satisfied indicators data. This file should be a csv in the same format as satisfied.csv.")
parser.add_argument('--d', type=str, help="Including this parameter will cause the script to refresh the dissatisfied indicators data. The parameter should immediately be followed by the file path of the file with the new dissatisfied indicators data. This file should be a csv in the same format as dissatisfied.csv.")
parser.add_argument('--p', type=str, help="Including this parameter will cause the script to refresh the problems data. The parameter should immediately be followed by the file path of the file with the new problems data. This file should be a csv file in the same format as problems.csv.")
parser.add_argument('--w', type=str, help="Including this parameter will cause the script to refresh the standard lists used by the visualization. The parameter should immediately be followed by the file path of the file with the new standard lists. This file should be an xlsx file in the same format as whitelist.xlsx.")
args = parser.parse_args()

# Check at least one parameter is not empty
if not args.s and not args.d and not args.p and not args.w:
    print("At least one parameter is required to run this script. Please type 'python create_data.py -h' for more information.")

else: 
    msg_text = ""

    # Indicators Data Update
    if args.s:
        mosaicS = MosaicData(data_filepath = args.s, data_type = 'consolidated', sat_or_dis = 's')
        mosaicS.import_consolidated_data(tab="satisfied")
        mosaicS.transform_consolidated_data(scalar = 100)
        mosaicS.output_data()
        msg_text = msg_text + "satisfied, "
    
    if args.d: 
        mosaicD = MosaicData(data_filepath = args.d, data_type = 'consolidated', sat_or_dis = 'd')
        mosaicD.import_consolidated_data(tab="dissatisfied")
        mosaicD.transform_consolidated_data(scalar = 100)
        mosaicD.output_data()
        msg_text = msg_text + "dissatisfied, "

    # Problems Data Update
    if args.p:
        mosaicP = MosaicData(data_filepath = args.p, data_type = 'problems')
        mosaicP.import_problems_data()
        mosaicP.transform_problems_data(scalar = 100)
        mosaicP.output_data()
        msg_text = msg_text + "problems, "

    # Standard (white) Lists Updates
    if args.w:
        mosaicW = MosaicData(data_filepath = args.w, data_type = 'whitelist')
        mosaicW.regenerate_whitelists()
        msg_text = msg_text + "standard lists, "

    # Print Success Message
    msg_text = msg_text[0].upper() + msg_text[1:(len(msg_text)-2)] + " "
    print(msg_text + "files succesfully refreshed!")