
CREATE DATABASE webdev;
use webdev;
GO;

DROP TABLE Pages;
DROP TABLE webContent;
GO;

-- Pages Table
CREATE TABLE Pages (
    PageID INT AUTO_INCREMENT PRIMARY KEY,
    PageName VARCHAR(100) NOT NULL UNIQUE,
    PageTitle VARCHAR(100) NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- webContent Table
CREATE TABLE webContent (
    ContentID INT AUTO_INCREMENT PRIMARY KEY,
    PageID INT NOT NULL,
    ShowOrder INT NOT NULL,
    Content TEXT NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (PageID) REFERENCES Pages(PageID) ON DELETE CASCADE ON UPDATE CASCADE
);


INSERT INTO Pages (PageName, PageTitle)
VALUES ('index', '2025 Honda CRF300L Rally');


INSERT INTO webContent (PageID, ShowOrder, Content)
VALUES (
    1, -- Replace with the actual PageID retrieved
    1,
    '
    <section id="hero">
        <div class="container">
            <!-- Hero Image -->
            <div class="hero-image">
                <img src="images/crf300l-hero.png" alt="2025 Honda CRF300L Rally">
            </div>
            <!-- Hero Text Content -->
            <div class="hero-content">
                <h1>Unleash the Adventure</h1>
                <p>Introducing the all-new 2025 Honda CRF300L Rally – Built for those who dare to explore.</p>
                <a href="#contact" class="cta-button">Pre-Order Now</a>
            </div>
        </div>
    </section>'
);



-- Change the delimiter to $$
DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetPageData`(
    IN in_PageName VARCHAR(100)
)
BEGIN
    -- GET the webContent for a particular PageName
    SELECT 
        p.PageName, 
        p.PageTitle, 
        w.Content
    FROM 
        Pages p
    INNER JOIN 
        webContent w 
        ON p.PageID = w.PageID
    WHERE 
        p.PageName = in_PageName
    ORDER BY 
        w.ShowOrder;
END$$

-- Revert the delimiter back to ;
DELIMITER ;


-- Create a special user for web
CREATE USER 'web'@'localhost' IDENTIFIED BY 'super_secure_password';

-- Grant execution to this user
GRANT EXECUTE ON PROCEDURE webdev.GetPageData TO 'web'@'localhost';


