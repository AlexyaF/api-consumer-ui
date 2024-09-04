function toggleMenu() {
    const menu = document.querySelector('.menu');
    const image = document.getElementById('logo_icon'); 
    const icons = document.getElementById('menu__icons'); 
    const container_icon = document.querySelector('.menu__icon__container.logo');
    const textOptions  = document.querySelectorAll('.menu__text__options ');

    if (menu && image && icons) {
        // Alterna as classes "collapsed" e "expanded" no menu
        menu.classList.toggle('collapsed');
        menu.classList.toggle('expanded');

        // Verifica se o menu está na classe "collapsed"
        if (menu.classList.contains('collapsed')) {
            // Esconde a imagem e aplica a estilização para a versão colapsada dos ícones
            image.classList.add('hidden');
            container_icon.classList.add('hidden');
            icons.classList.add('menu__icons_collapsed'); // Ajuste a classe aqui
            icons.classList.remove('menu__icons_expanded'); // Remove a classe expandida
            textOptions.forEach(option => {
                option.classList.add('hidden');
            });
        } else {
            // Exibe a imagem e aplica a estilização para a versão expandida dos ícones
            image.classList.remove('hidden');
            container_icon.classList.remove('hidden');
            icons.classList.add('menu__icons_expanded'); // Adiciona a classe expandida
            icons.classList.remove('menu__icons_collapsed'); // Remove a classe colapsada
            textOptions.forEach(option => {
                option.classList.remove('hidden');
            });
        }
    } else {
        console.error('Elemento com a classe "menu", ID "logo_icon" ou "menu__icons" não encontrado.');
    }
}
