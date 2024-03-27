import os
import time
from pprint import pprint
from dotenv import load_dotenv
load_dotenv()
import boto3
import openai
import pandas as pd
from botocore.exceptions import ClientError
from openai import OpenAI


filetexts  = dict()
table_csv="someval"
lines="someval"

def DisplayBlockInfo(block):
    print("Block Id: " + block['Id'])
    print("Type: " + block['BlockType'])
    if 'EntityTypes' in block:
        print('EntityTypes: {}'.format(block['EntityTypes']))

    if 'Text' in block:
        print("Text: " + block['Text'])

    if block['BlockType'] != 'PAGE':
        print("Confidence: " + "{:.2f}".format(block['Confidence']) + "%")

def get_table_csv_results(blocks):

    pprint(blocks)

    blocks_map = {}
    table_blocks = []
    for block in blocks:
        blocks_map[block['Id']] = block
        if block['BlockType'] == "TABLE":
            table_blocks.append(block)

    if len(table_blocks) <= 0:
        return "<b> NO Table FOUND </b>"

    csv = ''
    for index, table in enumerate(table_blocks):
        csv += generate_table_csv(table, blocks_map, index + 1)
        csv += '\n\n'
        # In order to generate separate CSV file for every table, uncomment code below
        #inner_csv = ''
        #inner_csv += generate_table_csv(table, blocks_map, index + 1)
        #inner_csv += '\n\n'
        #output_file = file_name + "___" + str(index) + ".csv"
        # replace content
        #with open(output_file, "at") as fout:
        #    fout.write(inner_csv)

    return csv

def generate_table_csv(table_result, blocks_map, table_index):
    rows = get_rows_columns_map(table_result, blocks_map)

    table_id = 'Table_' + str(table_index)

    # get cells.
    csv = 'Table: {0}\n\n'.format(table_id)

    for row_index, cols in rows.items():

        for col_index, text in cols.items():
            csv += '{}'.format(text) + ","
        csv += '\n'

    csv += '\n\n\n'
    return csv

def get_rows_columns_map(table_result, blocks_map):
    rows = {}
    for relationship in table_result['Relationships']:
        if relationship['Type'] == 'CHILD':
            for child_id in relationship['Ids']:
                try:
                    cell = blocks_map[child_id]
                    if cell['BlockType'] == 'CELL':
                        row_index = cell['RowIndex']
                        col_index = cell['ColumnIndex']
                        if row_index not in rows:
                            # create new row
                            rows[row_index] = {}

                        # get the text value
                        rows[row_index][col_index] = get_text(cell, blocks_map)
                except KeyError:
                    print("Error extracting Table data - {}:".format(KeyError))
                    pass
    return rows

def get_text(result, blocks_map):
    text = ''
    if 'Relationships' in result:
        for relationship in result['Relationships']:
            if relationship['Type'] == 'CHILD':
                for child_id in relationship['Ids']:
                    try:
                        word = blocks_map[child_id]
                        if word['BlockType'] == 'WORD':
                            text += word['Text'] + ' '
                        if word['BlockType'] == 'SELECTION_ELEMENT':
                            if word['SelectionStatus'] == 'SELECTED':
                                text += 'X '
                    except KeyError:
                        print("Error extracting Table data - {}:".format(KeyError))

    return text

def start_job(client, s3_bucket_name, object_name):
    response = None
    response = client.start_document_analysis(
        DocumentLocation={'S3Object': {'Bucket': s3_bucket_name, 'Name': object_name}},
        FeatureTypes=["TABLES"]
        )

    return response["JobId"]

def is_job_complete(client, job_id):
    time.sleep(1)
    response = client.get_document_analysis(JobId=job_id)
    status = response["JobStatus"]
    print("Job status: {}".format(status))

    while(status == "IN_PROGRESS"):
        time.sleep(1)
        response = client.get_document_analysis(JobId=job_id)
        status = response["JobStatus"]
        print("Job status: {}".format(status))

    return status

def get_job_results(client, job_id):
    pages = []
    time.sleep(1)
    response = client.get_document_analysis(JobId=job_id)
    pages.append(response)
    print("Resultset page received: {}".format(len(pages)))
    next_token = None
    if 'NextToken' in response:
        next_token = response['NextToken']

    while next_token:
        time.sleep(1)
        response = client.get_document_analysis(JobId=job_id, NextToken=next_token)
        pages.append(response)
        print("Resultset page received: {}".format(len(pages)))
        next_token = None
        if 'NextToken' in response:
            next_token = response['NextToken']

    return pages

def extract_text_from_pdf(pdf_file):
    global table_csv
    global lines
    document_name=pdf_file
    file=pdf_file.split('/')[-1]
    s3_bucket_name="textextractbucket17"
    s3_client = boto3.client('s3',aws_access_key_id='AKIA4MTWLND6TG4GPBYZ',aws_secret_access_key='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')
    try:
        response = s3_client.upload_file(Filename=document_name, Bucket=s3_bucket_name, Key=file)
    except ClientError as e:
        print(e)
    
    client = boto3.client('textract', region_name="eu-west-1",aws_access_key_id='AKIA4MTWLND6TG4GPBYZ',aws_secret_access_key='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')
    
    job_id = start_job(client, s3_bucket_name, file)
    print("Started job with id: {}".format(job_id))
    if is_job_complete(client, job_id):
        response = get_job_results(client, job_id)

    if os.path.exists('tables.csv'):
        os.remove('tables.csv')
    if os.path.exists('temp.txt'):
        os.remove('temp.txt')    

    for result_page in response:
        blocks = result_page['Blocks']
        table_csv = get_table_csv_results(blocks)
        output_file = "tables" + ".csv"
        with open(output_file, "at") as fout:
            fout.write(table_csv)
        print('Detected Document Text')
        print('Pages: {}'.format(result_page['DocumentMetadata']['Pages']))
        print('OUTPUT TO CSV FILE: ', output_file)

        for block in blocks:
            DisplayBlockInfo(block)
            print()
            print()
    
    lines=[]
    for result_page in response:
        for item in result_page["Blocks"]:
            if item["BlockType"] == "LINE":
                print(item["Text"])
                lines.append(item["Text"])
    lines=str(lines)
    with open('temp.txt', "w") as file:
            file.write(lines)


def extract_results(prompt):
    print(prompt)

    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
    )
    print('key',os.environ.get("OPENAI_API_KEY"))
    with open('temp.txt', "r") as file:
        lines=file.read()   
    with open('tables.csv', "r") as file:
        table_csv=file.read()    

    prompt = f"""
            Use the following data

            Raw Text data: ${lines}

            CSV Table data: ${table_csv}

            Extract the data as per the following requirements and represent in strictly level-1 JSON format:
            ${prompt}

            If any information cannot be found or extracted from either source, indicate it as null in the JSON output.
            """ 


    chat_completion = client.chat.completions.create(
            messages=[
                
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                
            ],
            # model="gpt-4-0125-preview",
            model="gpt-3.5-turbo-0125",
            temperature=0,
            response_format={"type": "json_object"},
        )
    print(chat_completion.choices[0].message.content)
    return chat_completion.choices[0].message.content


def extract_text_from_pdf(pdf_file):
    global table_csv
    global lines
    document_name=pdf_file
    file=pdf_file.split('/')[-1]
    s3_bucket_name="textextractbucket17"
    s3_client = boto3.client('s3',aws_access_key_id='AKIA4MTWLND6TG4GPBYZ',aws_secret_access_key='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')
    try:
        response = s3_client.upload_file(Filename=document_name, Bucket=s3_bucket_name, Key=file)
    except ClientError as e:
        print(e)
    
    client = boto3.client('textract', region_name="eu-west-1",aws_access_key_id='AKIA4MTWLND6TG4GPBYZ',aws_secret_access_key='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')
    
    job_id = start_job(client, s3_bucket_name, file)
    print("Started job with id: {}".format(job_id))
    if is_job_complete(client, job_id):
        response = get_job_results(client, job_id)

    if os.path.exists('tables.csv'):
        os.remove('tables.csv')
    if os.path.exists('temp.txt'):
        os.remove('temp.txt')    

    for result_page in response:
        blocks = result_page['Blocks']
        table_csv = get_table_csv_results(blocks)
        output_file = "tables" + ".csv"
        with open(output_file, "at") as fout:
            fout.write(table_csv)
        print('Detected Document Text')
        print('Pages: {}'.format(result_page['DocumentMetadata']['Pages']))
        print('OUTPUT TO CSV FILE: ', output_file)

        for block in blocks:
            DisplayBlockInfo(block)
            print()
            print()
    
    lines=[]
    for result_page in response:
        for item in result_page["Blocks"]:
            if item["BlockType"] == "LINE":
                print(item["Text"])
                lines.append(item["Text"])
    lines=str(lines)
    with open('temp.txt', "w") as file:
            file.write(lines)

