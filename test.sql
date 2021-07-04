select * from (select username, password, count(password) from log group by 1,2 ORDER BY COUNT(username) DESC)
 

 select * from (select City, count(*) from Customers group by 1 ORDER BY COUNT(City) DESC)

 SELECT count(*) FROM Customers;

 SELECT * FROM Customers ORDER BY CustomerID DESC LIMIT 1;

 