package com.cartadigital.backend.config;

import com.cartadigital.backend.entity.Category;
import com.cartadigital.backend.entity.Dish;
import com.cartadigital.backend.entity.RestaurantTable;
import com.cartadigital.backend.entity.Staff;
import com.cartadigital.backend.repository.CategoryRepository;
import com.cartadigital.backend.repository.DishRepository;
import com.cartadigital.backend.repository.RestaurantTableRepository;
import com.cartadigital.backend.repository.StaffRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Carga datos de ejemplo solo cuando las tablas están vacías. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final CategoryRepository categories;
    private final DishRepository dishes;
    private final RestaurantTableRepository tables;
    private final StaffRepository staff;

    public DataSeeder(CategoryRepository categories, DishRepository dishes,
                      RestaurantTableRepository tables, StaffRepository staff) {
        this.categories = categories;
        this.dishes = dishes;
        this.tables = tables;
        this.staff = staff;
    }

    @Override
    public void run(String... args) {
        if (categories.count() == 0) {
            Category entradas = categories.save(category("Entradas", 1));
            Category fondos = categories.save(category("Platos de fondo", 2));
            Category bebidas = categories.save(category("Bebidas", 3));
            categories.save(category("Postres", 4));

            dishes.save(dish("Ceviche clásico", "Pescado del día en leche de tigre", "38.00", entradas, "10 min"));
            dishes.save(dish("Causa limeña", "Papa amarilla, pollo y palta", "24.00", entradas, "8 min"));
            dishes.save(dish("Lomo saltado", "Lomo fino al wok con papas fritas", "45.00", fondos, "15 min"));
            dishes.save(dish("Ají de gallina", "Con arroz y huevo", "32.00", fondos, "12 min"));
            dishes.save(dish("Chicha morada", "Jarra de 1 litro", "15.00", bebidas, "2 min"));
        }
        if (tables.count() == 0) {
            tables.save(table("M01", 4, "salon"));
            tables.save(table("M02", 2, "salon"));
            tables.save(table("T01", 6, "terraza"));
            tables.save(table("B01", 2, "barra"));
        }
        if (staff.count() == 0) {
            staff.save(person("Ana Torres", "ana.torres", "admin", "Administradora", null));
            staff.save(person("Luis Quispe", "luis.quispe", "kitchen", "Chef principal", "Cocina caliente"));
            staff.save(person("María Rojas", "maria.rojas", "floor", "Mozo", "Salón"));
        }
    }

    private Category category(String name, int order) {
        Category c = new Category();
        c.setName(name);
        c.setSortOrder(order);
        return c;
    }

    private Dish dish(String name, String description, String price, Category category, String prepTime) {
        Dish d = new Dish();
        d.setName(name);
        d.setDescription(description);
        d.setPrice(new BigDecimal(price));
        d.setCategory(category);
        d.setPrepTime(prepTime);
        return d;
    }

    private RestaurantTable table(String number, int capacity, String zone) {
        RestaurantTable t = new RestaurantTable();
        t.setNumber(number);
        t.setCapacity(capacity);
        t.setZone(zone);
        return t;
    }

    private Staff person(String name, String username, String role, String title, String station) {
        Staff s = new Staff();
        s.setName(name);
        s.setUsername(username);
        s.setRole(role);
        s.setRoleTitle(title);
        s.setStation(station);
        return s;
    }
}
