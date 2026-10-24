package com.cartadigital.backend;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Prueba el CRUD completo de las cuatro tablas maestras contra H2. */
@SpringBootTest
@AutoConfigureMockMvc
class CrudApiTests {

    @Autowired
    MockMvc mvc;

    @Test
    void categoryCrudAndRules() throws Exception {
        mvc.perform(get("/api/categories")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(4)));

        String body = mvc.perform(post("/api/categories").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Sopas\",\"sortOrder\":5,\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();

        mvc.perform(put("/api/categories/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Sopas criollas\",\"sortOrder\":6,\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sopas criollas"));

        mvc.perform(post("/api/categories").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"sopas criollas\",\"sortOrder\":1,\"active\":true}"))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/categories").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists());

        mvc.perform(delete("/api/categories/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/categories/" + id)).andExpect(status().isNotFound());

        // "Entradas" (id 1) tiene platos: no se puede borrar
        mvc.perform(delete("/api/categories/1")).andExpect(status().isConflict());
    }

    @Test
    void dishCrud() throws Exception {
        String body = mvc.perform(post("/api/dishes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Arroz con pato\",\"price\":42.5,\"category\":{\"id\":2},\"active\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category.name").value("Platos de fondo"))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();

        mvc.perform(get("/api/dishes").param("categoryId", "2"))
                .andExpect(jsonPath("$[*].name", hasItem("Arroz con pato")));

        mvc.perform(put("/api/dishes/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Arroz con pato\",\"price\":44,\"category\":{\"id\":2},\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.price").value(44));

        mvc.perform(post("/api/dishes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"price\":-1,\"category\":{\"id\":999}}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.price").exists());

        mvc.perform(delete("/api/dishes/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void tableAndStaffCrud() throws Exception {
        mvc.perform(post("/api/tables").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"number\":\"M01\",\"capacity\":4,\"zone\":\"salon\",\"status\":\"disponible\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/tables").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"number\":\"V01\",\"capacity\":8,\"zone\":\"vip\",\"status\":\"reservada\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/tables").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"number\":\"Z9\",\"capacity\":0,\"zone\":\"luna\",\"status\":\"disponible\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.capacity").exists())
                .andExpect(jsonPath("$.errors.zone").exists());

        mvc.perform(post("/api/staff").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pedro\",\"username\":\"pedro.diaz\",\"role\":\"bar\",\"status\":\"Activo\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/staff").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Otro\",\"username\":\"pedro.diaz\",\"role\":\"bar\",\"status\":\"Activo\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/staff").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Otro\",\"username\":\"Mal Usuario\",\"role\":\"chef\",\"status\":\"Activo\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.role").exists());
    }
}
