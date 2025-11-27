
// 自动隐藏消息
document.addEventListener('DOMContentLoaded', function () {
    var messages = document.querySelectorAll('.alert');
    messages.forEach(function (message) {
        setTimeout(function () {
            var alert = bootstrap.Alert.getOrCreateInstance(message);
            alert.close();
        }, 2000); // 5秒后自动关闭
    });
});



  document.addEventListener("DOMContentLoaded", function() {
    // 检查屏幕宽度是否小于等于768px
    if (window.innerWidth <= 768) {
      // 找到"书讯"和"观点"的容器
      var section1 = document.querySelector('#section-1').closest('.col-md-6');
      var section2 = document.querySelector('#section-2').closest('.row');
      
      // 确保两个容器都存在
      if (section1 && section2) {
        // 获取section1的父元素
        var parent = section1.parentNode;
        
        // 将section2插入到section1之前
        parent.insertBefore(section2, section1);
      }
    }
  });




          // 当页面滚动时，显示或隐藏返回顶部按钮
          $(window).scroll(function () {
            if ($(this).scrollTop() > 20) {
                $('#back-to-top').fadeIn();
            } else {
                $('#back-to-top').fadeOut();
            }
        });

        // 当按钮被点击时，滚动到页面顶部
        $('#back-to-top').click(function () {
            $('html, body').animate({ scrollTop: 0 }, 'slow');
        });


        function formatDate(date) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekDay = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}年${month}月${day}日 星期${weekDay} ${hours}:${minutes}:${seconds}`;
        }
    
        function gregorianToHijri(date) {
            // 伊斯兰历算法
            const jd = Math.floor((date.getTime() - Date.UTC(1970, 0, 1)) / (1000 * 60 * 60 * 24)) + 2440588;
            const l = jd - 1948440 + 10632;
            const n = Math.floor((l - 1) / 10631);
            const l1 = l - 10631 * n + 354;
            const j = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
            const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
            
            const month = Math.floor((24 * l2) / 709);
            const day = l2 - Math.floor((709 * month) / 24);
            const year = 30 * n + j - 30;
    
            return `伊历：${year}年${month}月${day}日`;
        }
    
        function updateTime() {
            const now = new Date();
            
            // 更新公历时间
            document.getElementById('current-time').textContent = formatDate(now);
            
            // 更新伊斯兰历时间
            document.getElementById('hijri-date').textContent = gregorianToHijri(now);
        }
    
        // 初始更新时间
        updateTime();
        // 每秒更新一次时间
        setInterval(updateTime, 1000);


        document.addEventListener('DOMContentLoaded', function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                // 移除所有的 active 类
                link.classList.remove('active');
                
                // 检查是否是当前页面
                if (link.getAttribute('href') === currentPath) {
                    link.classList.add('current');  // 使用 current 替代 active
                }
            });
        });
