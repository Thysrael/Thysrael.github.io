import os
import yaml

# 遍历 _post 文件夹下的所有 .md 文件
post_folder = '_posts'
for filename in os.listdir(post_folder):
    if filename.endswith('.md'):
        filepath = os.path.join(post_folder, filename)

        # 读取文件
        with open(filepath, 'r') as file:
            content = file.readlines()

        # 将 YAML 头部部分转换为Python对象
        header_lines = []
        content_start = 0
        for i, line in enumerate(content):
            if line.strip() == '---':
                if header_lines:
                    content_start = i + 1
                    break
            header_lines.append(line)

        header = yaml.safe_load(''.join(header_lines))

        # 将 Python 对象转换为 YAML 字符串
        new_header = '---\n' + yaml.dump(header, allow_unicode=True, default_flow_style=None) + '---\n'

        # 去除行首非法的 "\t"
        new_lines = []
        for i, line in enumerate(content[content_start:]):
            if line.startswith("​"):
                new_line = line.lstrip("​\t")
            else:
                new_line = line
            new_lines.append(new_line)

        # 构建新内容
        new_content = new_header + ''.join(new_lines)

        # 将新内容写入文件
        with open(filepath, 'w') as file:
            file.write(new_content)
