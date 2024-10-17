import sys

def remove_hash_lines(input_file, output_file):
    with open(input_file, 'r') as file:
        lines = file.readlines()

    with open(output_file, 'w') as file:
        for line in lines:
            if line.startswith('#'):
                start = line.rfind('#') + 1 # 计算 `#` 后的空格坐标
                tmp = line[start + 1:]
                end = tmp.find(' ') # 计算数字标号后的空格坐标
                new_line = ""
                if end == -1: # 对于二级标题特殊处理
                    end = 2
                    new_line = line[:start + 1] + tmp[end:]
                else:
                    new_line = line[:start] + tmp[end:]
                file.write(new_line)
            else:
                file.write(line)

def insert_blank_line(input_file, output_file):
    with open(input_file, 'r') as file:
        lines = file.readlines()

    with open(output_file, 'w') as file:
        for i in range(len(lines)):
            file.write(lines[i])
            if i < len(lines) - 1 and lines[i].strip() and lines[i+1].strip():
                file.write('\n')

# 获取命令行参数
input_file = sys.argv[1]
output_file = input_file
remove_hash_lines(input_file, output_file)
insert_blank_line(input_file, output_file)
