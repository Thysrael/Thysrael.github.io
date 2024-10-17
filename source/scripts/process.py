import yaml

# 读取文件
with open('数学分析-傅里叶级数.md', 'r') as file:
    content = file.readlines()

# 将YAML头部部分转换为Python对象
header_lines = []
content_start = 0
for i, line in enumerate(content):
    if line.strip() == '---':
        if header_lines:
            content_start = i + 1
            break
    header_lines.append(line)

# print(header_lines)
# print(content_start)

header = yaml.safe_load(''.join(header_lines))

# print(header)

# 将Python对象转换为YAML字符串
new_header = '---\n' + yaml.dump(header, allow_unicode=True, default_flow_style=None) + '---\n'

# print(new_header)
new_content = []
for line in content[content_start:]:
    new_line = line.lstrip("​\t")
    new_content.append(new_line)

new_content = ''.join(new_content)

# 构建新内容
new_content = new_header + new_content

print(new_content)
# 将新内容写入文件
with open('数学分析-傅里叶级数.md', 'w') as file:
    file.write(new_content)
