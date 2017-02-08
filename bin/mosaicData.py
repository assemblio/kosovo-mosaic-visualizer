#!/usr/local/bin/python2.7
# -*- coding: utf-8 -*-
import pandas as pd
import os, shutil
import json

class MosaicData:
    
    def __init__(self, data_filepath, data_type, sat_or_dis = None, mapping_filepath = None, values_filepath = None):
            # data_type can be 'raw', 'consolidated', 'problems' and 'whitelist'
            # sat_or_dis can be 's' or 'd'

            self.data_path = data_filepath
            self.data_type = data_type
            self.status = 'created'
            
            # Check sat_or_dis is 'd' or 's'
            if data_type == 'consolidated':
                if sat_or_dis.lower() != 'd' and sat_or_dis.lower() != 's':
                    raise TypeError('When importing consolidated data, the \'sat_or_dis\' parameter must be set to \'s\' (satisfied %) or \'d\' (dissatisfied %).')
                else:
                    self.sat_or_dis = sat_or_dis.lower()
            
            # Handle additional parameters if data type = 'raw'
            if data_type == 'raw': 
                if mapping_filepath != None:
                    raise TypeError('When data_type set to \'raw\', a path for a mapping must be passed.')
                elif values_filepath != None:
                    raise TypeError('When data_type set to \'raw\', a path for a value mapping must be passed.')
                else:
                    self.mapping = mapping_filepath
                    self.values = values_filepath

    def import_raw_data(self):
        if self.status == 'created':
            if self.data_type == 'raw':
                # Import raw data
                self.data = pd.read_csv(self.data_path, header=0, delimiter=',', quoting=1, index_col=0, dtype=str)

                # Import lookup
                mapping = pd.read_csv(self.mapping, header=0, delimiter=',', quoting=1, index_col=0)

                # Extract appropriate columns
                questions = list(mapping['question'])
                data = data[questions]

                # Update Column Names
                column_names = list(mapping['refined_name'])
                data.columns = column_names
                self.data = data
                self.status = 'imported'
            else:
                print('MosaicData object has wrong datatype for this method.')
        else:
            print('MosaicData object has to be in \'created\' status to use import_raw_data method. Currently in \'' + self.status + '\' status.')
    
    def import_consolidated_data(self, tab):
        if self.status == 'created':
            if self.data_type == 'consolidated':
                # Import consolidated data
                data = pd.read_excel(self.data_path, tab, header=0, index_col=None)
                self.data = data
                self.status = 'imported'
            else: 
                print('MosaicData object has wrong datatype for this method.')
        else:
            print('MosaicData object has to be in \'created\' status to use import_consolidated_data method. Currently in \'' + self.status + '\' status.')

    def import_problems_data(self):
        if self.status == 'created':
            if self.data_type == 'problems':
                # Import consolidated data
                data = pd.read_excel(self.data_path, "problems", header=0, index_col=None)
                self.data = data
                self.status = 'imported'
            else: 
                print('MosaicData object has wrong datatype for this method.')
        else:
            print('MosaicData object has to be in \'created\' status to use import_problems_data method. Currently in \'' + self.status + '\' status.')

    def convert_to_values(self, value_method):
        data = self.data
        # import value mapping
        value_map = pd.read_csv(self.values, header=0, delimiter=',', quoting=1, index_col=0)
        text_values = list(value_map.index)
        
        # Get columns to be mapped
        mapping = pd.read_csv(self.mapping, header=0, delimiter=',', quoting=1, index_col=0)
        cols_w_text = list(mapping.loc[mapping.conversion_needed == 1,'refined_name'])
        
        # Get remaining columns
        all_cols = list(data.columns)
        all_cols.remove('Municipality')
        other_cols = list(set(all_cols) - set(cols_w_text))
        
        # Replace text fields 
        for col in cols_w_text:
            matches = pd.Series(data[col]).isin(text_values)
            unmapped = len(matches) - matches.sum()
            
            # Print warning if unmapped values found
            if unmapped > 0:
                print('Warning: ' + str(unmapped) + ' record(s) in the column ' + col + ' did not match a value in the value mapping.')

            for text in text_values:
                    data.loc[data[col] == text, col] = value_map.at[text, value_method]
                
        # Replace whitespace fields with 0
        for col in other_cols:
            data.loc[data[col].str.strip() == '', col] = 0
        
        # Convert all fields to numeric datatype
        for col in all_cols:
            try:
                data[col] = data[col].astype(float)
            except:
                print('Warning: At least 1 value in column ' + col + ' could not be converted to a numeric datatype.')
        self.data = data

    def aggregate_scores(self, aggregate_by):
        return self.data.groupby(aggregate_by).mean()
        
    def transform_consolidated_data(self, year_col = 'year', indicator_col = 'indicator', scalar = 1):
        if self.status == 'imported':
            if self.data_type == 'consolidated':
                data = self.data
        
                # Get unique year values
                years = data[year_col].drop_duplicates().values.tolist()
                years = sorted(years)
                final_data = []
        
                # Get Column List
                all_cols = list(data.columns)
                all_cols.remove(year_col)
                all_cols.remove(indicator_col)
        
                # Loop through years, pull out data, transpose and store in list
                for year in years:
                    year_data = data.loc[data[year_col] == year, ]
                    reindexed_data = year_data.set_index(keys = indicator_col, drop=True)[all_cols]
            
                    # Transpose the data and multiply by optional scalar
                    transposed_data = reindexed_data.transpose() * scalar
                    result_set = {'year' : year,
                    'data' : transposed_data}
                    final_data.append(result_set)
            
                self.data = final_data
                self.status = 'transformed'
            else: 
                print('MosaicData object requires data_type = \'consolidated\' to use transform_consolidated_data method.')
        else:
            print('MosaicData object has to be in \'imported\' status to use transform_consolidated_data method. Currently in \'' + self.status + '\' status.')
    
    def transform_problems_data(self, year_col = 'year', problem_col = 'problem', scalar = 1):
        if self.status == 'imported':
            if self.data_type == 'problems':
                data = self.data
            
                # Get unique year values
                years = data[year_col].drop_duplicates().values.tolist()
                years = sorted(years)
                final_data = {}
        
                # Get muncipalities List
                municipalities = list(data.columns)
                municipalities.remove(year_col)
                municipalities.remove(problem_col)
            
            
                # Scale Data
                data[municipalities] = data[municipalities]*scalar
                
                # Loop through municipalities 
                for muni in municipalities:
                    result_set = {}
                    muni_data = data.loc[ : , [year_col, problem_col, muni]]
                    muni_data = muni_data.loc[muni_data[muni].notnull(),]
                    
                    # Loop through years
                    for year in years:
                        year_data = muni_data.loc[data[year_col] == year, [problem_col, muni]]
                        
                        if not year_data.empty:
                            year_data.columns = ['label', 'value']
                            year_data = year_data.to_dict(orient = 'records')
                    
                            # Create dictionary with values
                            result_set[year] = year_data
                    
                    final_data[muni] = result_set
            
                self.data = final_data
                self.status = 'transformed'
                
            else: 
                print('MosaicData object requires data_type = \'problems\' to use transform_problems_data method.')
        else:
            print('MosaicData object has to be in \'imported\' status to use transform_problems_data method. Currently in \'' + self.status + '\' status.')
    
    def output_data(self, output_file = './data/clean_data/', output_type = 'json'):
        if self.status == 'transformed':
            data = self.data
            final_dict = {}
        
            # Consolidated data type
            if self.data_type == 'consolidated':
                for entries in data:
                    year = entries['year']
                
                    # Is the data satisfied or dissatisfied percentage?
                    if self.sat_or_dis == 's':
                        file_path = output_file + str(year) + 'S'
                    elif self.sat_or_dis == 'd':
                        file_path = output_file + str(year) + 'D'
                    
                    # If CSV, return individual files
                    if output_type == 'csv':
                        file_path = file_path + '.csv'
                        entries['data'].to_csv(path_or_buf = file_path, force_ascii = False) 
                    else: 
                        final_dict[year] = entries['data'].to_dict(orient='index')
                
                # If JSON, return merged JSON file
                if output_type == 'json':
                    if self.sat_or_dis == 's':
                        file_path = './data/clean_data/satisfied.js'
                        with open(file_path, 'w') as data_file:
                            data_file.write("function getSData() {return "
                                             + json.dumps(obj = final_dict, indent = 4, sort_keys = True)
                                             + "}")
                    elif self.sat_or_dis == 'd':
                        file_path = './data/clean_data/dissatisfied.js'
                        with open(file_path, 'w') as data_file:
                            data_file.write("function getDData() {return "
                                             + json.dumps(obj = final_dict, indent = 4, sort_keys = True)
                                             + "}")
        
            # Problem data type
            if self.data_type == 'problems': 
                file_path = output_file + 'problems.js'
                with open(file_path, 'w') as data_file:
                    data_file.write("function getProblemsData() {return "
                                     + json.dumps(obj = data, indent = 4, sort_keys = True)
                                     + "}")
        
            # Raw Datatype
            elif self.data_type == 'raw':
                if output_type == 'csv':
                    data.to_csv(path_or_buf = output_file, force_ascii = False)
                else:
                    data.to_json(orient = 'index', path_or_buf = output_file, force_ascii = False)
        else:
            print('MosaicData object has to be in \'transformed\' status to use output_data method. Currently in \'' + self.status + '\' status.')
    
    def delete_old_files(self, folder = './data/clean_data/'):
        for the_file in os.listdir(folder):
            file_path = os.path.join(folder, the_file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception, e:
                print e
    
    def regenerate_whitelists(self):
        if self.data_type == 'whitelist':
            keys = ['municipalities', 'indicators', 'problems']
            for key in keys:
                sheet = pd.read_excel(self.data_path, key, index_col = 0)
                output_file = './data/standard_lists/' + key + '.js'
                json_file = sheet.to_json(orient = 'index', force_ascii = False)
                with open(output_file, 'w') as data_file:
                    if key == 'problems':
                        data_file.write("function getProblemsTranslation() {return "
                                         + str(json_file)
                                         + "}")
                    else:
                        data_file.write("function get" + key + "Data() {return "
                                         + str(json_file)
                                         + "}")
                
        else: 
            print('MosaicData object requires data_type = \'whitelist\' to use regenerate_whitelists method.')