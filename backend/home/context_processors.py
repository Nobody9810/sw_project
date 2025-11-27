def section(request):
    # 根据请求的路径或其他条件来确定当前板块
    section = 'tongxun'  
    section = 'yiling'  
    section = 'guandian' 
    return {'section': section}


