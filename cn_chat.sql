-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306:3000
-- Generation Time: Feb 25, 2025 at 09:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chat`
--

-- --------------------------------------------------------

--
-- Table structure for table `cn_chat`
--

CREATE TABLE `cn_chat` (
  `id_chat` int(11) NOT NULL,
  `message` text NOT NULL,
  `user_id` int(11) NOT NULL,
  `id_group_chat` varchar(100) NOT NULL,
  `time_chat` varchar(100) NOT NULL,
  `who` varchar(200) NOT NULL,
  `img` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cn_chat`
--

INSERT INTO `cn_chat` (`id_chat`, `message`, `user_id`, `id_group_chat`, `time_chat`, `who`, `img`) VALUES
(219, 'Hie Admin', 1, 'hdew_Admin', '07:25 18/02/2025', 'hdew', ''),
(220, 'Hie Admin', 1, 'hdew_Admin', '07:25 18/02/2025', 'Admin', ''),
(221, 'h', 1, 'hdew_Admin', '13:09 21/02/2025', 'hdew', ''),
(222, 'h', 1, 'hdew_Admin', '13:09 21/02/2025', 'Admin', ''),
(223, 'https://www.youtube.com/watch?v=hxTTe7jGiVI', 1, 'hdew_Admin', '13:09 21/02/2025', 'hdew', ''),
(224, 'https://www.youtube.com/watch?v=hxTTe7jGiVI', 1, 'hdew_Admin', '13:09 21/02/2025', 'Admin', ''),
(225, 'http://localhost:5000/Video?room=test_995022427', 1, 'hdew_Admin', '13:10 21/02/2025', 'hdew', ''),
(226, 'http://localhost:5000/Video?room=test_995022427', 1, 'hdew_Admin', '13:10 21/02/2025', 'Admin', ''),
(227, 'https//google.com', 1, 'hdew_Admin', '13:19 21/02/2025', 'hdew', ''),
(228, 'https//google.com', 1, 'hdew_Admin', '13:19 21/02/2025', 'Admin', ''),
(229, 'https://example.com', 1, 'hdew_Admin', '13:19 21/02/2025', 'hdew', ''),
(230, 'https://example.com', 1, 'hdew_Admin', '13:19 21/02/2025', 'Admin', ''),
(231, 'https://example.com', 1, 'hdew_Admin', '13:34 21/02/2025', 'hdew', ''),
(232, 'https://example.com', 1, 'hdew_Admin', '13:34 21/02/2025', 'Admin', ''),
(233, 'http://google.com', 1, 'hdew_Admin', '13:47 21/02/2025', 'hdew', ''),
(234, 'http://google.com', 1, 'hdew_Admin', '13:47 21/02/2025', 'Admin', ''),
(235, '&lt;a href=&quot;https://example.com&quot; target=&quot;_blank&quot; style=&quot;color:blue;text-decoration:underline;&quot;&gt;https://example.com&lt;/a&gt;', 1, 'hdew_Admin', '14:10 21/02/2025', 'hdew', ''),
(236, '&lt;a href=&quot;https://example.com&quot; target=&quot;_blank&quot; style=&quot;color:blue;text-decoration:underline;&quot;&gt;https://example.com&lt;/a&gt;', 1, 'hdew_Admin', '14:10 21/02/2025', 'Admin', ''),
(237, '<a href=\"https://example.com\" target=\"_blank\" style=\"color:blue;text-decoration:underline;\">https://example.com</a>', 1, 'hdew_Admin', '14:22 21/02/2025', 'hdew', ''),
(238, '<a href=\"https://example.com\" target=\"_blank\" style=\"color:blue;text-decoration:underline;\">https://example.com</a>', 1, 'hdew_Admin', '14:22 21/02/2025', 'Admin', ''),
(239, '<a href=\"https://www.google.com/\" target=\"_blank\" style=\"color:blue;text-decoration:underline;\">https://www.google.com/</a>', 1, 'hdew_Admin', '14:29 21/02/2025', 'hdew', ''),
(240, '<a href=\"https://www.google.com/\" target=\"_blank\" style=\"color:blue;text-decoration:underline;\">https://www.google.com/</a>', 1, 'hdew_Admin', '14:29 21/02/2025', 'Admin', ''),
(241, 'a', 1, 'hdew_Admin', '16:49 21/02/2025', 'hdew', ''),
(242, 'a', 1, 'hdew_Admin', '16:49 21/02/2025', 'Admin', ''),
(243, 'Hie', 1, 'hdew_Admin', '09:21 23/02/2025', 'hdew', ''),
(244, 'Hie', 1, 'hdew_Admin', '09:21 23/02/2025', 'Admin', ''),
(245, 'Hello', 4, 'hdew_Admin', '09:29 23/02/2025', 'hdew', ''),
(246, 'Hello', 4, 'hdew_Admin', '09:29 23/02/2025', 'Admin', ''),
(247, 'Done', 4, 'hdew_Admin', '09:30 23/02/2025', 'hdew', ''),
(248, 'Done', 4, 'hdew_Admin', '09:30 23/02/2025', 'Admin', ''),
(249, 'Hie User', 2, 'johndoe_Admin', '09:33 23/02/2025', 'johndoe', ''),
(250, 'Hie User', 2, 'johndoe_Admin', '09:33 23/02/2025', 'Admin', ''),
(251, 'Hie', 4, 'johndoe_Admin', '09:34 23/02/2025', 'johndoe', ''),
(252, 'Hie', 4, 'johndoe_Admin', '09:34 23/02/2025', 'Admin', '');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cn_chat`
--
ALTER TABLE `cn_chat`
  ADD PRIMARY KEY (`id_chat`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cn_chat`
--
ALTER TABLE `cn_chat`
  MODIFY `id_chat` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=253;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
