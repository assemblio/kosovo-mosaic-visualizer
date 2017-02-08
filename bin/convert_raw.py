#!/usr/local/bin/python3.1
# -*- coding: utf-8 -*-
from mosaicData import MosaicData
import json

data_filepath = "../data/raw_data/Mosaic 2012.csv"
mapping_filepath = "../data/mapping/2012.csv"
values_filepath = "../data/values.csv"
output_filepath = "../data/output.json"
value_method = 'score'
data_type = 'raw'


mosaic2012 = MosaicData(data_filepath, data_type, mapping_filepath, values_filepath)
results1 = mosaic2012.import_raw_data()
results2 = mosaic2012.convert_to_values(results1, value_method)
results3 = mosaic2012.aggregate_scores(results2, "Municipality")
results4 = mosaic2012.return_json(results3, output_filepath)