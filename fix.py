with open('src/components/app-shell.tsx', 'r') as f:
    lines = f.readlines()

header_start = -1
header_end = -1
main_start = -1

for i, line in enumerate(lines):
    if '{/* CENTER: Floating Pill Navbar (Tabs Only) */}' in line:
        header_start = i
    if '</header>' in line:
        header_end = i
    if '{/* Main Content Area */}' in line:
        main_start = i

if header_start != -1 and header_end != -1 and main_start != -1:
    header_block = lines[header_start:header_end+1]
    del lines[header_start:header_end+1]
    main_start -= (header_end + 1 - header_start)
    lines = lines[:main_start] + ['\n'] + header_block + ['\n'] + lines[main_start:]
    with open('src/components/app-shell.tsx', 'w') as f:
        f.writelines(lines)
    print("Moved successfully!")
else:
    print("Could not find lines")
